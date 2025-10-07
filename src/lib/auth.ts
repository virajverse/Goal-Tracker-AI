import type { NextResponse } from "next/server";
import { verifyJWT, signJWT } from "./jwt";
import { supabaseAdmin } from "./supabase";

export const AUTH_COOKIE = "auth_token";

export interface SessionPayload {
  user_id: string;
  email?: string;
}

export type UserRole = "admin" | "agent" | "user";

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

function parseCookieHeader(
  header: string | null | undefined,
  name: string,
): string | null {
  if (!header) return null;
  const parts = header.split(";");
  for (const p of parts) {
    const [k, ...rest] = p.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

export async function getSession(req: Request): Promise<SessionPayload | null> {
  // Try NextRequest.cookies.get first (when available), otherwise parse header
  const anyReq = req as any;
  let token: string | null = null;
  try {
    const c = anyReq?.cookies?.get?.(AUTH_COOKIE);
    token = typeof c === "string" ? c : (c?.value ?? null);
  } catch { /* ignore cookie access errors */ }
  if (!token) {
    token = parseCookieHeader(req.headers.get("cookie"), AUTH_COOKIE);
  }
  if (!token) return null;
  try {
    const payload = await verifyJWT<SessionPayload>(token, getJwtSecret());
    return payload;
  } catch {
    return null;
  }
}

export async function requireSession(req: Request): Promise<SessionPayload> {
  const session = await getSession(req);
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function getSupabaseUser(user_id: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(user_id);
  if (error || !data.user) throw new Error("User not found");
  return data.user;
}

export function getUserRoleFromMetadata(
  meta: Record<string, any> | null | undefined,
): UserRole {
  const role = meta?.role;
  if (role === "admin" || role === "agent" || role === "user") return role;
  return "user";
}

export async function requireRole(
  req: Request,
  allowed: UserRole[],
): Promise<{ user_id: string; role: UserRole; email?: string }> {
  const session = await requireSession(req);
  const u = await getSupabaseUser(session.user_id);
  const role = getUserRoleFromMetadata((u.user_metadata as any) || {});
  if (!allowed.includes(role)) {
    const err = new Error("Forbidden") as Error & { status?: number };
    err.status = 403;
    throw err;
  }
  return { user_id: session.user_id, role, email: session.email };
}

export async function setSessionCookie(
  res: NextResponse,
  payload: SessionPayload,
): Promise<void> {
  const token = await signJWT(
    payload as unknown as Record<string, unknown>,
    getJwtSecret(),
  );
  const prod = process.env.NODE_ENV === "production";
  res.cookies.set({
    name: AUTH_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: prod,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set({
    name: AUTH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
