export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || 'Invalid credentials' }, { status: 401 });
    }

    const user = data.user;
    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name ?? '',
        profile_image: user.user_metadata?.profile_image ?? '',
        is_email_verified: !!user.email_confirmed_at,
        is_phone_verified: false,
      },
    });
    await setSessionCookie(res, { user_id: user.id, email: user.email || undefined });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Login failed' }, { status: 500 });
  }
}
