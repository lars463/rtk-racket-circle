-- ============================================
-- RTK Racket Circle - Proper RLS Policies
-- Run this in Supabase SQL Editor
--
-- VIGTIGT: Alle policies har `TO anon, authenticated` (CLAUDE.md regel #1).
-- Helper-funktioner (SECURITY DEFINER) bruges til at undgå RLS-recursion.
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
-- HELPER FUNCTIONS (SECURITY DEFINER — bypasser RLS)
-- ============================================

-- Tjek om current user er deltager i en samtale
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id
      AND profile_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID) TO anon, authenticated;

-- Tjek om current user er admin (undgår JOIN-spam)
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO anon, authenticated;

-- ============================================
-- PROFILES
-- ============================================

-- All authenticated users can view profiles
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO anon, authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO anon, authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile (for deactivate/activate, admin flag)
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE TO anon, authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- Admins can insert new profiles (add member)
CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.current_user_is_admin());

-- Admins can delete profiles
CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE TO anon, authenticated
  USING (public.current_user_is_admin());

-- ============================================
-- EVENTS
-- ============================================

CREATE POLICY "events_select" ON events
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "events_insert" ON events
  FOR INSERT TO anon, authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "events_update" ON events
  FOR UPDATE TO anon, authenticated
  USING (auth.uid() = created_by OR public.current_user_is_admin());

CREATE POLICY "events_delete" ON events
  FOR DELETE TO anon, authenticated
  USING (auth.uid() = created_by OR public.current_user_is_admin());

-- ============================================
-- EVENT PARTICIPANTS
-- ============================================

CREATE POLICY "event_participants_select" ON event_participants
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "event_participants_insert" ON event_participants
  FOR INSERT TO anon, authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "event_participants_delete" ON event_participants
  FOR DELETE TO anon, authenticated
  USING (auth.uid() = profile_id OR public.current_user_is_admin());

-- ============================================
-- MATCHES
-- ============================================

CREATE POLICY "matches_select" ON matches
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "matches_insert" ON matches
  FOR INSERT TO anon, authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "matches_update" ON matches
  FOR UPDATE TO anon, authenticated
  USING (auth.uid() = creator_id OR public.current_user_is_admin());

CREATE POLICY "matches_delete" ON matches
  FOR DELETE TO anon, authenticated
  USING (auth.uid() = creator_id OR public.current_user_is_admin());

-- ============================================
-- MATCH PARTICIPANTS
-- ============================================

CREATE POLICY "match_participants_select" ON match_participants
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "match_participants_insert" ON match_participants
  FOR INSERT TO anon, authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "match_participants_delete" ON match_participants
  FOR DELETE TO anon, authenticated
  USING (auth.uid() = profile_id OR public.current_user_is_admin());

-- ============================================
-- CONVERSATIONS
-- ============================================

CREATE POLICY "conversations_select" ON conversations
  FOR SELECT TO anon, authenticated
  USING (public.is_conversation_participant(id));

CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE TO anon, authenticated
  USING (public.is_conversation_participant(id));

CREATE POLICY "conversations_delete" ON conversations
  FOR DELETE TO anon, authenticated
  USING (public.is_conversation_participant(id) OR public.current_user_is_admin());

-- ============================================
-- CONVERSATION PARTICIPANTS
-- ============================================

CREATE POLICY "conversation_participants_select" ON conversation_participants
  FOR SELECT TO anon, authenticated
  USING (public.is_conversation_participant(conversation_id));

CREATE POLICY "conversation_participants_insert" ON conversation_participants
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "conversation_participants_delete" ON conversation_participants
  FOR DELETE TO anon, authenticated
  USING (profile_id = auth.uid() OR public.current_user_is_admin());

-- ============================================
-- MESSAGES
-- ============================================

CREATE POLICY "messages_select" ON messages
  FOR SELECT TO anon, authenticated
  USING (public.is_conversation_participant(conversation_id));

CREATE POLICY "messages_insert" ON messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_conversation_participant(conversation_id)
  );

CREATE POLICY "messages_update" ON messages
  FOR UPDATE TO anon, authenticated
  USING (public.is_conversation_participant(conversation_id));

-- ============================================
-- RPC: Auto-cleanup old matches (runs as SECURITY DEFINER)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_matches()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM matches
  WHERE date::date < (CURRENT_DATE - INTERVAL '2 days');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_old_matches() TO anon, authenticated;

-- ============================================
-- TRIGGER: Auto-cleanup orphan conversations
-- (Når sidste deltager forlader → slet samtale + beskeder)
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_orphan_conversations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = OLD.conversation_id
  ) THEN
    DELETE FROM conversations WHERE id = OLD.conversation_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_orphan_conversations ON conversation_participants;
CREATE TRIGGER trg_cleanup_orphan_conversations
  AFTER DELETE ON conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_orphan_conversations();

-- ============================================
-- CHECK CONSTRAINT: Match formats (singles, singles_mix, doubles, mixed)
-- ============================================

ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_format_check;
ALTER TABLE matches ADD CONSTRAINT matches_format_check
  CHECK (format IN ('singles', 'singles_mix', 'doubles', 'mixed'));

-- ============================================
-- REALTIME: Add missing tables
-- ============================================

-- These may already be added; errors are safe to ignore
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE event_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_participants;
