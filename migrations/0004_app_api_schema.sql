-- App API schema for Supabase (numeric IDs), matching Next.js routes
-- This migration creates the tables used by /api/goals and /api/daily-logs

-- Helper: updated_at trigger
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Goals table expected by API
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
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Daily logs table expected by API
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

DROP TRIGGER IF EXISTS update_daily_logs_updated_at ON public.daily_logs;
CREATE TRIGGER update_daily_logs_updated_at
BEFORE UPDATE ON public.daily_logs
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Note:
-- If you previously created a different goals table (e.g., with UUID id or different columns),
-- you may need to migrate or drop it to align with this schema the API expects.
-- Run this SQL in your Supabase project's SQL editor.
