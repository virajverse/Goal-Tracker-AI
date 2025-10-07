-- Add summary fields to chat_conversations for long-term memory
BEGIN;
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS last_summary_at TIMESTAMPTZ;
COMMIT;