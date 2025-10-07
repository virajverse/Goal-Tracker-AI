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
      if (typeof b.description === "string")
        updates.description = b.description;
      if (
        b.status === "upcoming" ||
        b.status === "ongoing" ||
        b.status === "completed" ||
        b.status === "archived"
      )
        updates.status = b.status;
      if (typeof b.deadline === "string") updates.deadline = b.deadline;
      if (
        Array.isArray(b.tech_stack) &&
        b.tech_stack.every((t) => typeof t === "string")
      )
        updates.tech_stack = b.tech_stack;
      if (typeof b.priority === "number") updates.priority = b.priority;
    }
    if (
      updates.priority !== undefined &&
      (typeof updates.priority !== "number" ||
        updates.priority < 1 ||
        updates.priority > 3)
    ) {
      return NextResponse.json(
        { error: "Priority must be 1..3" },
        { status: 400 },
      );
    }
    if (Object.keys(updates).length === 0)
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );

    const { data, error } = await supabaseAdmin
      .from("projects")
      .update(updates)
      .eq("id", id)
      .eq("user_id", session.user_id)
      .select("*")
      .single();

    if (error || !data)
      return NextResponse.json(
        { error: error?.message || "Failed to update project" },
        { status: 400 },
      );
    return NextResponse.json({ project: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : null;
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to update project" },
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
      .from("projects")
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
      { error: "Failed to delete project" },
      { status: 500 },
    );
  }
}
