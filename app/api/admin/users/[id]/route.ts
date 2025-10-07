export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireRole, getUserRoleFromMetadata } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(req, ["admin"]);
    const { id } = await params;
    const userId = id;
    if (!userId)
      return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || "User not found" },
        { status: 404 },
      );
    }
    const u = data.user;
    return NextResponse.json({
      user: {
        id: u.id,
        email: u.email,
        name: (u.user_metadata as any)?.name || "",
        role: getUserRoleFromMetadata((u.user_metadata as any) || {}),
        created_at: u.created_at,
        last_sign_in_at: (u as any)?.last_sign_in_at ?? null,
      },
    });
  } catch (err: any) {
    const status = err?.status === 403 ? 403 : 401;
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }
}
