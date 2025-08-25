import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, signJWT } from './jwt';
import { supabaseAdmin } from './supabase';

export const AUTH_COOKIE = 'auth_token';

export interface SessionPayload {
  user_id: string;
  email?: string;
}

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
}

export async function getSession(req: NextRequest): Promise<SessionPayload | null> {
  const cookie = req.cookies.get(AUTH_COOKIE);
  if (!cookie?.value) return null;
  try {
    const payload = await verifyJWT<SessionPayload>(cookie.value, getJwtSecret());
    return payload;
  } catch {
    return null;
  }
}

export async function requireSession(req: NextRequest): Promise<SessionPayload> {
  const session = await getSession(req);
  if (!session) throw new Error('Unauthorized');
  return session;
}

export async function getSupabaseUser(user_id: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(user_id);
  if (error || !data.user) throw new Error('User not found');
  return data.user;
}

export async function setSessionCookie(res: NextResponse, payload: SessionPayload) {
  const token = await signJWT(payload, getJwtSecret());
  const prod = process.env.NODE_ENV === 'production';
  res.cookies.set({
    name: AUTH_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: prod,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set({
    name: AUTH_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
