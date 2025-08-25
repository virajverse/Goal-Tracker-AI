import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!SUPABASE_URL) {
  console.warn('Supabase env var missing: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
}
if (!SUPABASE_ANON_KEY) {
  console.warn('Supabase env var missing: SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Supabase env var missing: SUPABASE_SERVICE_ROLE_KEY');
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
  auth: { persistSession: false },
});

export const supabaseAdmin = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '', {
  auth: { persistSession: false },
});
