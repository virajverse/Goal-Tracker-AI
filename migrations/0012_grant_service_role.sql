-- Ensure service_role (and authenticated) can read/write required tables and use sequences
BEGIN;

-- Schema usage
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

-- Core app tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.goals TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.daily_logs TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_suggestions TO authenticated, service_role;

-- Chat tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chat_conversations TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chat_messages TO authenticated, service_role;

-- Admin settings (server-only): grant to service_role only
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_settings TO service_role;

-- Sequences for BIGSERIAL ids
GRANT USAGE, SELECT ON SEQUENCE public.goals_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.daily_logs_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.ai_suggestions_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.chat_conversations_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.chat_messages_id_seq TO authenticated, service_role;

COMMIT;
