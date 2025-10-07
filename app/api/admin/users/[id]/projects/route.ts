export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(req, ["admin"]);
    const { id } = await ctx.params;
    const userId = id;
    if (!userId)
      return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("projects")
      .select(
        "id, title, description, status, deadline, tech_stack, priority, created_at, updated_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ projects: data || [] });
  } catch (err: any) {
    const status = err?.status === 403 ? 403 : 401;
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }
}
