export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Create user via Admin API so we can immediately set session
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (createError || !created.user) {
      return NextResponse.json({ error: createError?.message || 'Failed to create user' }, { status: 400 });
    }

    const user = created.user;

    // Optionally verify credentials by signing in (not strictly required)
    // const signIn = await supabase.auth.signInWithPassword({ email, password });

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
    return NextResponse.json({ error: err?.message || 'Signup failed' }, { status: 500 });
  }
}
