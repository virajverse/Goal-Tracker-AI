-- Chat conversations and messages with RLS
-- Mirrors patterns used in prior migrations (BIGSERIAL ids, update_modified_column trigger, RLS policies)

BEGIN;

-- Conversations
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated ON public.chat_conversations(updated_at DESC);

DROP TRIGGER IF EXISTS update_chat_conversations_updated_at ON public.chat_conversations;
CREATE TRIGGER update_chat_conversations_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- Messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  token_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON public.chat_messages(user_id);

-- Grants & RLS
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop policies if present (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_conversations') THEN
    EXECUTE 'DROP POLICY IF EXISTS "chat_conversations_select_own" ON public.chat_conversations';
    EXECUTE 'DROP POLICY IF EXISTS "chat_conversations_insert_own" ON public.chat_conversations';
    EXECUTE 'DROP POLICY IF EXISTS "chat_conversations_update_own" ON public.chat_conversations';
    EXECUTE 'DROP POLICY IF EXISTS "chat_conversations_delete_own" ON public.chat_conversations';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_messages') THEN
    EXECUTE 'DROP POLICY IF EXISTS "chat_messages_select_own" ON public.chat_messages';
    EXECUTE 'DROP POLICY IF EXISTS "chat_messages_insert_own" ON public.chat_messages';
    EXECUTE 'DROP POLICY IF EXISTS "chat_messages_update_own" ON public.chat_messages';
    EXECUTE 'DROP POLICY IF EXISTS "chat_messages_delete_own" ON public.chat_messages';
  END IF;
END $$;

-- Conversations policies
CREATE POLICY "chat_conversations_select_own" ON public.chat_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "chat_conversations_insert_own" ON public.chat_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chat_conversations_update_own" ON public.chat_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "chat_conversations_delete_own" ON public.chat_conversations FOR DELETE USING (auth.uid() = user_id);

-- Messages policies (must belong to user's conversation)
CREATE POLICY "chat_messages_select_own" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "chat_messages_insert_own" ON public.chat_messages FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()
  )
);
CREATE POLICY "chat_messages_update_own" ON public.chat_messages FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()
  )
);
CREATE POLICY "chat_messages_delete_own" ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);

COMMIT;
