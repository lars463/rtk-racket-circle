-- ============================================
-- RTK Racket Circle — RLS Recursion Fix
-- Run this in Supabase SQL Editor (idempotent — kan køres flere gange)
--
-- Fixer:
--   1. Infinite recursion på conversation_participants_select policy
--   2. Manglende `TO anon, authenticated` på beskedrelaterede policies
--   3. Manglende DELETE-policy på conversation_participants
--   4. Effektivisering via SECURITY DEFINER helper-funktion
-- ============================================

-- Helper: Tjek om current user er deltager i en samtale (bypasser RLS)
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

-- Helper: Tjek om current user er admin (bypasser RLS — undgår JOIN-spam i policies)
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
-- CONVERSATION_PARTICIPANTS — drop alt, genskab uden recursion
-- ============================================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversation_participants'
  LOOP
    EXECUTE format('DROP POLICY %I ON conversation_participants', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "conversation_participants_select" ON conversation_participants
  FOR SELECT TO anon, authenticated
  USING (public.is_conversation_participant(conversation_id));

CREATE POLICY "conversation_participants_insert" ON conversation_participants
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "conversation_participants_delete" ON conversation_participants
  FOR DELETE TO anon, authenticated
  USING (
    profile_id = auth.uid()
    OR public.current_user_is_admin()
  );

-- ============================================
-- CONVERSATIONS — drop og genskab med helper + anon role
-- ============================================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversations'
  LOOP
    EXECUTE format('DROP POLICY %I ON conversations', pol.policyname);
  END LOOP;
END $$;

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
  USING (
    public.is_conversation_participant(id)
    OR public.current_user_is_admin()
  );

-- ============================================
-- MESSAGES — drop og genskab med helper + anon role
-- ============================================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages'
  LOOP
    EXECUTE format('DROP POLICY %I ON messages', pol.policyname);
  END LOOP;
END $$;

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
-- CASCADE CLEANUP: Når sidste deltager forlader samtale → slet samtale + beskeder
-- (Forhindrer orphan conversations når et medlem slettes)
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_orphan_conversations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Slet samtale hvis ingen deltagere er tilbage
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

-- Ryd op i eksisterende orphans (samtaler uden deltagere)
DELETE FROM messages
WHERE conversation_id IN (
  SELECT c.id FROM conversations c
  LEFT JOIN conversation_participants cp ON cp.conversation_id = c.id
  WHERE cp.id IS NULL
);

DELETE FROM conversations
WHERE id NOT IN (SELECT DISTINCT conversation_id FROM conversation_participants);

-- ============================================
-- VERIFICATION (returneres som notice ved kørsel)
-- ============================================
DO $$
DECLARE
  cp_policies INTEGER;
  c_policies INTEGER;
  m_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO cp_policies FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversation_participants';
  SELECT COUNT(*) INTO c_policies FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversations';
  SELECT COUNT(*) INTO m_policies FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages';

  RAISE NOTICE 'RLS fix complete:';
  RAISE NOTICE '  conversation_participants: % policies (forventet 3)', cp_policies;
  RAISE NOTICE '  conversations: % policies (forventet 4)', c_policies;
  RAISE NOTICE '  messages: % policies (forventet 3)', m_policies;
END $$;
