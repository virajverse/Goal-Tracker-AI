export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    let raw: unknown = null;
    try {
      raw = await req.json();
    } catch {}
    let email: string | undefined;
    let password: string | undefined;
    let name: string | undefined;
    if (raw && typeof raw === "object") {
      const b = raw as { email?: unknown; password?: unknown; name?: unknown };
      if (typeof b.email === "string") email = b.email;
      if (typeof b.password === "string") password = b.password;
      if (typeof b.name === "string") name = b.name;
    }
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    // Create user via Admin API so we can immediately set session
    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: "user" },
      });
    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message || "Failed to create user" },
        { status: 400 },
      );
    }

    const user = created.user;

    // Optionally verify credentials by signing in (not strictly required)
    // const signIn = await supabase.auth.signInWithPassword({ email, password });

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata.name ?? "",
        profile_image: user.user_metadata.profile_image ?? "",
        role: (user.user_metadata as any)?.role ?? "user",
        is_email_verified: !!user.email_confirmed_at,
        is_phone_verified: false,
      },
    });
    await setSessionCookie(res, {
      user_id: user.id,
      email: user.email || undefined,
    });
    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : undefined;
    return NextResponse.json(
      { error: msg || "Signup failed" },
      { status: 500 },
    );
  }
}
