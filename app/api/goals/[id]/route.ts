export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession(req);
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isFinite(id))
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const updates = await req.json();
    const allowed = [
      "title",
      "description",
      "category",
      "target_frequency",
      "is_active",
    ];
    const payload: Record<string, any> = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) payload[key] = updates[key];
    }
    if (Object.keys(payload).length === 0)
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );

    const { data, error } = await supabaseAdmin
      .from("goals")
      .update(payload)
      .eq("id", id)
      .eq("user_id", session.user_id)
      .select("*")
      .single();

    if (error || !data)
      return NextResponse.json(
        { error: error?.message || "Failed to update goal" },
        { status: 400 },
      );
    return NextResponse.json({ goal: data });
  } catch (err: any) {
    if (err?.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to update goal" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession(req);
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isFinite(id))
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("goals")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user_id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to delete goal" },
      { status: 500 },
    );
  }
}
