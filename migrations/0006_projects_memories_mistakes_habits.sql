-- Advanced schema for Projects, Memories, Mistakes & Learnings, Habits
-- Aligned with existing Supabase/Next.js patterns. Includes RLS and indexes.

BEGIN;

-- Helper trigger (exists from earlier migrations, re-declare idempotently)
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

/************************
 * Projects
 ************************/
CREATE TABLE IF NOT EXISTS public.projects (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','ongoing','completed','archived')),
  deadline DATE,
  tech_stack TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  priority INTEGER NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_deadline ON public.projects(deadline);

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- Project notes
CREATE TABLE IF NOT EXISTS public.project_notes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id BIGINT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_notes_user ON public.project_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_project ON public.project_notes(project_id);

DROP TRIGGER IF EXISTS update_project_notes_updated_at ON public.project_notes;
CREATE TRIGGER update_project_notes_updated_at
BEFORE UPDATE ON public.project_notes
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

/************************
 * Memories
 ************************/
CREATE TABLE IF NOT EXISTS public.memories (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  mood_tag TEXT CHECK (mood_tag IN ('happy','sad','success','failure')),
  memory_date DATE NOT NULL DEFAULT CURRENT_DATE,
  image_path TEXT, -- storage path (private bucket). Use signed URLs for access
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memories_user ON public.memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_user_date ON public.memories(user_id, memory_date DESC);
CREATE INDEX IF NOT EXISTS idx_memories_mood ON public.memories(mood_tag);

DROP TRIGGER IF EXISTS update_memories_updated_at ON public.memories;
CREATE TRIGGER update_memories_updated_at
BEFORE UPDATE ON public.memories
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- Create private storage bucket for memory images (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('memories', 'memories', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for memories bucket (per-user folder)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects') THEN
    EXECUTE 'DROP POLICY IF EXISTS "memories_select_own" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "memories_insert_own" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "memories_update_own" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "memories_delete_own" ON storage.objects';
  END IF;
END $$;

CREATE POLICY "memories_select_own" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'memories' AND (name LIKE auth.uid()::text || '/%'));

CREATE POLICY "memories_insert_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'memories' AND (name LIKE auth.uid()::text || '/%'));

CREATE POLICY "memories_update_own" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'memories' AND (name LIKE auth.uid()::text || '/%'))
WITH CHECK (bucket_id = 'memories' AND (name LIKE auth.uid()::text || '/%'));

CREATE POLICY "memories_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'memories' AND (name LIKE auth.uid()::text || '/%'));

/************************
 * Mistakes & Learnings
 ************************/
CREATE TABLE IF NOT EXISTS public.mistakes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  lesson_learned TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','repeated','solved')),
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  last_occurred_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mistakes_user ON public.mistakes(user_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_status ON public.mistakes(status);
CREATE INDEX IF NOT EXISTS idx_mistakes_last_occurred ON public.mistakes(last_occurred_at DESC);

DROP TRIGGER IF EXISTS update_mistakes_updated_at ON public.mistakes;
CREATE TRIGGER update_mistakes_updated_at
BEFORE UPDATE ON public.mistakes
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

/************************
 * Habits
 ************************/
CREATE TABLE IF NOT EXISTS public.habits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  habit_type TEXT NOT NULL CHECK (habit_type IN ('good','bad')),
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily','weekly','monthly')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_habits_user ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_active ON public.habits(is_active);

DROP TRIGGER IF EXISTS update_habits_updated_at ON public.habits;
CREATE TRIGGER update_habits_updated_at
BEFORE UPDATE ON public.habits
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- Habit logs (one per day per habit)
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  habit_id BIGINT NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_habit_logs_unique_per_day UNIQUE (user_id, habit_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date ON public.habit_logs(habit_id, log_date DESC);

DROP TRIGGER IF EXISTS update_habit_logs_updated_at ON public.habit_logs;
CREATE TRIGGER update_habit_logs_updated_at
BEFORE UPDATE ON public.habit_logs
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

/************************
 * Grants & RLS
 ************************/
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mistakes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_logs TO authenticated;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DO $$
BEGIN
  -- projects
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='projects') THEN
    EXECUTE 'DROP POLICY IF EXISTS "projects_select_own" ON public.projects';
    EXECUTE 'DROP POLICY IF EXISTS "projects_insert_own" ON public.projects';
    EXECUTE 'DROP POLICY IF EXISTS "projects_update_own" ON public.projects';
    EXECUTE 'DROP POLICY IF EXISTS "projects_delete_own" ON public.projects';
  END IF;

  -- project_notes
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_notes') THEN
    EXECUTE 'DROP POLICY IF EXISTS "project_notes_select_own" ON public.project_notes';
    EXECUTE 'DROP POLICY IF EXISTS "project_notes_insert_own" ON public.project_notes';
    EXECUTE 'DROP POLICY IF EXISTS "project_notes_update_own" ON public.project_notes';
    EXECUTE 'DROP POLICY IF EXISTS "project_notes_delete_own" ON public.project_notes';
  END IF;

  -- memories
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='memories') THEN
    EXECUTE 'DROP POLICY IF EXISTS "memories_select_own" ON public.memories';
    EXECUTE 'DROP POLICY IF EXISTS "memories_insert_own" ON public.memories';
    EXECUTE 'DROP POLICY IF EXISTS "memories_update_own" ON public.memories';
    EXECUTE 'DROP POLICY IF EXISTS "memories_delete_own" ON public.memories';
  END IF;

  -- mistakes
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mistakes') THEN
    EXECUTE 'DROP POLICY IF EXISTS "mistakes_select_own" ON public.mistakes';
    EXECUTE 'DROP POLICY IF EXISTS "mistakes_insert_own" ON public.mistakes';
    EXECUTE 'DROP POLICY IF EXISTS "mistakes_update_own" ON public.mistakes';
    EXECUTE 'DROP POLICY IF EXISTS "mistakes_delete_own" ON public.mistakes';
  END IF;

  -- habits
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='habits') THEN
    EXECUTE 'DROP POLICY IF EXISTS "habits_select_own" ON public.habits';
    EXECUTE 'DROP POLICY IF EXISTS "habits_insert_own" ON public.habits';
    EXECUTE 'DROP POLICY IF EXISTS "habits_update_own" ON public.habits';
    EXECUTE 'DROP POLICY IF EXISTS "habits_delete_own" ON public.habits';
  END IF;

  -- habit_logs
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='habit_logs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "habit_logs_select_own" ON public.habit_logs';
    EXECUTE 'DROP POLICY IF EXISTS "habit_logs_insert_own" ON public.habit_logs';
    EXECUTE 'DROP POLICY IF EXISTS "habit_logs_update_own" ON public.habit_logs';
    EXECUTE 'DROP POLICY IF EXISTS "habit_logs_delete_own" ON public.habit_logs';
  END IF;
END $$;

-- Projects policies
CREATE POLICY "projects_select_own" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "projects_insert_own" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects_update_own" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "projects_delete_own" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- Project notes policies (must belong to user's project)
CREATE POLICY "project_notes_select_own" ON public.project_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "project_notes_insert_own" ON public.project_notes FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "project_notes_update_own" ON public.project_notes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "project_notes_delete_own" ON public.project_notes FOR DELETE USING (auth.uid() = user_id);

-- Memories policies
CREATE POLICY "memories_select_own" ON public.memories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "memories_insert_own" ON public.memories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "memories_update_own" ON public.memories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "memories_delete_own" ON public.memories FOR DELETE USING (auth.uid() = user_id);

-- Mistakes policies
CREATE POLICY "mistakes_select_own" ON public.mistakes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "mistakes_insert_own" ON public.mistakes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mistakes_update_own" ON public.mistakes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "mistakes_delete_own" ON public.mistakes FOR DELETE USING (auth.uid() = user_id);

-- Habits policies
CREATE POLICY "habits_select_own" ON public.habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "habits_insert_own" ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habits_update_own" ON public.habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "habits_delete_own" ON public.habits FOR DELETE USING (auth.uid() = user_id);

-- Habit logs policies (must belong to user's habit)
CREATE POLICY "habit_logs_select_own" ON public.habit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "habit_logs_insert_own" ON public.habit_logs FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.habits h WHERE h.id = habit_id AND h.user_id = auth.uid()
  )
);
CREATE POLICY "habit_logs_update_own" ON public.habit_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.habits h WHERE h.id = habit_id AND h.user_id = auth.uid()
  )
);
CREATE POLICY "habit_logs_delete_own" ON public.habit_logs FOR DELETE USING (auth.uid() = user_id);

COMMIT;
