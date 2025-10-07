export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await requireSession(req);
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isFinite(id))
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    let raw: unknown = null;
    try {
      raw = await req.json();
    } catch {}
    const updates: Record<string, unknown> = {};
    if (raw && typeof raw === "object") {
      const b = raw as Record<string, unknown>;
      if (typeof b.title === "string") updates.title = b.title;
      if (typeof b.content === "string") updates.content = b.content;
      if (
        b.mood_tag === "happy" ||
        b.mood_tag === "sad" ||
        b.mood_tag === "success" ||
        b.mood_tag === "failure"
      )
        updates.mood_tag = b.mood_tag;
      if (typeof b.memory_date === "string")
        updates.memory_date = b.memory_date;
      if (typeof b.image_path === "string") updates.image_path = b.image_path;
    }
    if (
      updates.mood_tag !== undefined &&
      !(
        updates.mood_tag === "happy" ||
        updates.mood_tag === "sad" ||
        updates.mood_tag === "success" ||
        updates.mood_tag === "failure"
      )
    ) {
      return NextResponse.json({ error: "Invalid mood_tag" }, { status: 400 });
    }
    if (Object.keys(updates).length === 0)
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );

    const { data, error } = await supabaseAdmin
      .from("memories")
      .update(updates)
      .eq("id", id)
      .eq("user_id", session.user_id)
      .select("*")
      .single();

    if (error || !data)
      return NextResponse.json(
        { error: error?.message || "Failed to update memory" },
        { status: 400 },
      );
    return NextResponse.json({ memory: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : null;
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to update memory" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await requireSession(req);
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isFinite(id))
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("memories")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user_id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : null;
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to delete memory" },
      { status: 500 },
    );
  }
}
