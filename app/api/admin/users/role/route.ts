export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { UserRole } from "@/lib/auth";
import { requireRole, getUserRoleFromMetadata } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ["admin"]);
    const body = await req.json().catch(() => ({}));
    const user_id = typeof body?.user_id === "string" ? body.user_id : "";
    const role = body?.role as UserRole | undefined;
    if (!user_id || !role || !["user", "agent", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "user_id and valid role are required" },
        { status: 400 },
      );
    }
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { user_metadata: { role } },
    );
    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || "Failed to update role" },
        { status: 400 },
      );
    }
    const u = data.user;
    return NextResponse.json({
      user: {
        id: u.id,
        email: u.email,
        role: getUserRoleFromMetadata((u.user_metadata as any) || {}),
      },
    });
  } catch (err: any) {
    const status = err?.status === 403 ? 403 : 401;
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }
}
