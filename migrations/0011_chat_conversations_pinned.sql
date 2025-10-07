-- Add pinned (favorites) to chat_conversations and index for sorting
BEGIN;
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_chat_conversations_pinned_updated ON public.chat_conversations(pinned DESC, updated_at DESC);
COMMIT;
