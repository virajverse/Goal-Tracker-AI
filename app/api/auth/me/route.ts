export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession, getSupabaseUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ user: null });
    }

    const user = await getSupabaseUser(session.user_id);
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: (user.user_metadata as any)?.name ?? '',
        profile_image: (user.user_metadata as any)?.profile_image ?? '',
        is_email_verified: !!user.email_confirmed_at,
        is_phone_verified: false,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ user: null });
  }
}
