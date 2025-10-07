export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireRole, getUserRoleFromMetadata } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ["admin"]);
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") || "1");
    const perPage = Number(searchParams.get("perPage") || "100");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    const users = (data.users || []).map((u) => ({
      id: u.id,
      email: u.email,
      name: (u.user_metadata as any)?.name || "",
      role: getUserRoleFromMetadata((u.user_metadata as any) || {}),
      created_at: u.created_at,
    }));

    return NextResponse.json({
      users,
      page,
      perPage,
      total: data.total ?? users.length,
    });
  } catch (err: any) {
    const status = err?.status === 403 ? 403 : 401;
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }
}
