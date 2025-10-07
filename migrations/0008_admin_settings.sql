  -- Admin-managed settings store for AI provider and API keys
  BEGIN;

  CREATE TABLE IF NOT EXISTS public.admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_admin_settings_updated_at ON public.admin_settings(updated_at DESC);

  -- Keep this table server-only. Do not grant to authenticated. RLS on with no policies blocks non-service access.
  ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

  COMMIT;
