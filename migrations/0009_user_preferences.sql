-- User preferences for language and tone
-- Table: public.user_preferences
-- Keys: user_id (PK)
-- RLS: users can CRUD only their own row

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_language TEXT CHECK (default_language IN ('en','hi','hinglish')),
  tone TEXT NOT NULL DEFAULT 'empathetic' CHECK (tone IN ('empathetic','coaching','formal','casual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- Grants and RLS
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_preferences' AND policyname='Allow read own user_preferences') THEN
    EXECUTE 'DROP POLICY "Allow read own user_preferences" ON public.user_preferences';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_preferences' AND policyname='Allow upsert own user_preferences') THEN
    EXECUTE 'DROP POLICY "Allow upsert own user_preferences" ON public.user_preferences';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_preferences' AND policyname='Allow delete own user_preferences') THEN
    EXECUTE 'DROP POLICY "Allow delete own user_preferences" ON public.user_preferences';
  END IF;
END $$;

CREATE POLICY "Allow read own user_preferences" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow upsert own user_preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow upsert own user_preferences update" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow delete own user_preferences" ON public.user_preferences FOR DELETE USING (auth.uid() = user_id);

COMMIT;
