-- ============================================
-- RTK Racket Circle - Proper RLS Policies
-- Run this in Supabase SQL Editor
-- ============================================

-- First: drop all existing permissive policies
DROP POLICY IF EXISTS "Allow all for profiles" ON profiles;
DROP POLICY IF EXISTS "Allow all for events" ON events;
DROP POLICY IF EXISTS "Allow all for event_participants" ON event_participants;
DROP POLICY IF EXISTS "Allow all for conversations" ON conversations;
DROP POLICY IF EXISTS "Allow all for conversation_participants" ON conversation_participants;
DROP POLICY IF EXISTS "Allow all for messages" ON messages;

-- Also drop any matches policies if they exist
DROP POLICY IF EXISTS "Allow all for matches" ON matches;
DROP POLICY IF EXISTS "Allow all for match_participants" ON match_participants;

-- ============================================
-- PROFILES
-- ============================================

-- All authenticated users can view active profiles
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile (for deactivate/activate, admin flag)
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Admins can insert new profiles (add member)
CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Admins can delete profiles
CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- EVENTS
-- ============================================

-- All authenticated users can view events
CREATE POLICY "events_select" ON events
  FOR SELECT TO authenticated
  USING (true);

-- Authenticated users can create events
CREATE POLICY "events_insert" ON events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Creator or admin can update events
CREATE POLICY "events_update" ON events
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Creator or admin can delete events
CREATE POLICY "events_delete" ON events
  FOR DELETE TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- EVENT PARTICIPANTS
-- ============================================

-- All authenticated users can see participants
CREATE POLICY "event_participants_select" ON event_participants
  FOR SELECT TO authenticated
  USING (true);

-- Users can add themselves as participant
CREATE POLICY "event_participants_insert" ON event_participants
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = profile_id);

-- Users can remove themselves (or admin can remove anyone)
CREATE POLICY "event_participants_delete" ON event_participants
  FOR DELETE TO authenticated
  USING (
    auth.uid() = profile_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- MATCHES
-- ============================================

-- All authenticated users can view matches
CREATE POLICY "matches_select" ON matches
  FOR SELECT TO authenticated
  USING (true);

-- Authenticated users can create matches
CREATE POLICY "matches_insert" ON matches
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id);

-- Creator or admin can update matches
CREATE POLICY "matches_update" ON matches
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = creator_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Creator or admin can delete matches
CREATE POLICY "matches_delete" ON matches
  FOR DELETE TO authenticated
  USING (
    auth.uid() = creator_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- MATCH PARTICIPANTS
-- ============================================

-- All authenticated users can see match participants
CREATE POLICY "match_participants_select" ON match_participants
  FOR SELECT TO authenticated
  USING (true);

-- Users can add themselves
CREATE POLICY "match_participants_insert" ON match_participants
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = profile_id);

-- Users can remove themselves (or admin/creator)
CREATE POLICY "match_participants_delete" ON match_participants
  FOR DELETE TO authenticated
  USING (
    auth.uid() = profile_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- CONVERSATIONS
-- ============================================

-- Users can only see conversations they participate in
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id
      AND profile_id = auth.uid()
    )
  );

-- Authenticated users can create conversations
CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Participants or admin can delete conversations
CREATE POLICY "conversations_delete" ON conversations
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id
      AND profile_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- CONVERSATION PARTICIPANTS
-- ============================================

-- Users can see participants of their own conversations
CREATE POLICY "conversation_participants_select" ON conversation_participants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants AS cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.profile_id = auth.uid()
    )
  );

-- Authenticated users can add participants (when starting a conversation)
CREATE POLICY "conversation_participants_insert" ON conversation_participants
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================
-- MESSAGES
-- ============================================

-- Users can only see messages in their conversations
CREATE POLICY "messages_select" ON messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND profile_id = auth.uid()
    )
  );

-- Users can send messages to conversations they're in
CREATE POLICY "messages_insert" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND profile_id = auth.uid()
    )
  );

-- Users can update messages in their conversations (for mark as read)
CREATE POLICY "messages_update" ON messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND profile_id = auth.uid()
    )
  );

-- ============================================
-- RPC: Auto-cleanup old matches (runs as SECURITY DEFINER)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_matches()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM matches
  WHERE date::date < (CURRENT_DATE - INTERVAL '2 days')
  RETURNING 1 INTO deleted_count;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================
-- REALTIME: Add missing tables
-- ============================================

-- These may already be added; errors are safe to ignore
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE event_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_participants;
