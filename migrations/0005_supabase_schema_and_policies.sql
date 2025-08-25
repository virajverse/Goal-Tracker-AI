-- Supabase schema and RLS policies aligned to Next.js API
-- Tables: public.goals (BIGSERIAL id), public.daily_logs, public.ai_suggestions
-- Safe guards included to avoid collisions with older UUID-based goals table

BEGIN;

-- Ensure helpful extension exists (optional)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper: updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- If an older UUID-based goals table exists, preserve it by renaming
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='goals' AND column_name='id' AND data_type='uuid'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name='goals_uuid_legacy'
    ) THEN
      EXECUTE 'ALTER TABLE public.goals RENAME TO goals_uuid_legacy';
    END IF;
  END IF;
END $$;

-- Goals (BIGSERIAL id) as expected by the API
CREATE TABLE IF NOT EXISTS public.goals (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  target_frequency TEXT NOT NULL CHECK (target_frequency IN ('daily','weekly','monthly')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_created ON public.goals(created_at DESC);

DROP TRIGGER IF EXISTS update_goals_updated_at ON public.goals;
CREATE TRIGGER update_goals_updated_at
BEFORE UPDATE ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- Daily logs with uniqueness per (user_id, goal_id, log_date)
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_id BIGINT NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_daily_logs_unique_per_day UNIQUE (user_id, goal_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON public.daily_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_logs_goal ON public.daily_logs(goal_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_goal ON public.daily_logs(user_id, goal_id);

DROP TRIGGER IF EXISTS update_daily_logs_updated_at ON public.daily_logs;
CREATE TRIGGER update_daily_logs_updated_at
BEFORE UPDATE ON public.daily_logs
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- AI suggestions used by /api/ai-suggestions
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  suggestion_text TEXT NOT NULL,
  suggestion_type TEXT NOT NULL DEFAULT 'general',
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user ON public.ai_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_created ON public.ai_suggestions(created_at DESC);

DROP TRIGGER IF EXISTS update_ai_suggestions_updated_at ON public.ai_suggestions;
CREATE TRIGGER update_ai_suggestions_updated_at
BEFORE UPDATE ON public.ai_suggestions
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- Grants: allow authenticated role to use these tables (RLS will protect row access)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_suggestions TO authenticated;

-- Enable Row Level Security
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Re-create policies idempotently (drop if present)
DO $$
BEGIN
  -- goals
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='goals' AND policyname='Allow read own goals') THEN
    EXECUTE 'DROP POLICY "Allow read own goals" ON public.goals';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='goals' AND policyname='Allow insert own goals') THEN
    EXECUTE 'DROP POLICY "Allow insert own goals" ON public.goals';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='goals' AND policyname='Allow update own goals') THEN
    EXECUTE 'DROP POLICY "Allow update own goals" ON public.goals';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='goals' AND policyname='Allow delete own goals') THEN
    EXECUTE 'DROP POLICY "Allow delete own goals" ON public.goals';
  END IF;

  -- daily_logs
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='daily_logs' AND policyname='Allow read own daily_logs') THEN
    EXECUTE 'DROP POLICY "Allow read own daily_logs" ON public.daily_logs';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='daily_logs' AND policyname='Allow insert own daily_logs') THEN
    EXECUTE 'DROP POLICY "Allow insert own daily_logs" ON public.daily_logs';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='daily_logs' AND policyname='Allow update own daily_logs') THEN
    EXECUTE 'DROP POLICY "Allow update own daily_logs" ON public.daily_logs';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='daily_logs' AND policyname='Allow delete own daily_logs') THEN
    EXECUTE 'DROP POLICY "Allow delete own daily_logs" ON public.daily_logs';
  END IF;

  -- ai_suggestions
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_suggestions' AND policyname='Allow read own ai_suggestions') THEN
    EXECUTE 'DROP POLICY "Allow read own ai_suggestions" ON public.ai_suggestions';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_suggestions' AND policyname='Allow insert own ai_suggestions') THEN
    EXECUTE 'DROP POLICY "Allow insert own ai_suggestions" ON public.ai_suggestions';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_suggestions' AND policyname='Allow update own ai_suggestions') THEN
    EXECUTE 'DROP POLICY "Allow update own ai_suggestions" ON public.ai_suggestions';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_suggestions' AND policyname='Allow delete own ai_suggestions') THEN
    EXECUTE 'DROP POLICY "Allow delete own ai_suggestions" ON public.ai_suggestions';
  END IF;
END $$;

-- Goals policies
CREATE POLICY "Allow read own goals" ON public.goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow insert own goals" ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow update own goals" ON public.goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow delete own goals" ON public.goals FOR DELETE USING (auth.uid() = user_id);

-- Daily logs policies
CREATE POLICY "Allow read own daily_logs" ON public.daily_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow insert own daily_logs" ON public.daily_logs FOR INSERT WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.goals g WHERE g.id = goal_id AND g.user_id = auth.uid()));
CREATE POLICY "Allow update own daily_logs" ON public.daily_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.goals g WHERE g.id = goal_id AND g.user_id = auth.uid()));
CREATE POLICY "Allow delete own daily_logs" ON public.daily_logs FOR DELETE USING (auth.uid() = user_id);

-- AI suggestions policies
CREATE POLICY "Allow read own ai_suggestions" ON public.ai_suggestions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow insert own ai_suggestions" ON public.ai_suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow update own ai_suggestions" ON public.ai_suggestions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow delete own ai_suggestions" ON public.ai_suggestions FOR DELETE USING (auth.uid() = user_id);

COMMIT;
