export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession(req);
    const { id } = await params;
    const conversationId = Number(id);
    if (!conversationId || Number.isNaN(conversationId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    let body: unknown = null;
    try {
      body = await req.json();
    } catch {}
    const b = (body || {}) as { title?: unknown; pinned?: unknown };
    const patch: any = {};
    if (typeof b.title === "string")
      patch.title = b.title.trim().slice(0, 120) || "New chat";
    if (typeof b.pinned === "boolean") patch.pinned = b.pinned;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No changes" }, { status: 400 });
    }

    // Ownership check
    const { data: conv, error: convErr } = await supabaseAdmin
      .from("chat_conversations")
      .select("id,user_id")
      .eq("id", conversationId)
      .single();
    if (convErr || !conv)
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    if (conv.user_id !== session.user_id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    patch.updated_at = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("chat_conversations")
      .update(patch)
      .eq("id", conversationId)
      .select("id,title,updated_at,pinned")
      .single();
    if (error || !data)
      return NextResponse.json(
        { error: error.message || "Failed to update" },
        { status: 400 },
      );
    return NextResponse.json({ conversation: data });
  } catch (err: any) {
    if (err?.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to update conversation" },
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
    const { id } = await params;
    const conversationId = Number(id);
    if (!conversationId || Number.isNaN(conversationId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // Ownership check
    const { data: conv, error: convErr } = await supabaseAdmin
      .from("chat_conversations")
      .select("id,user_id")
      .eq("id", conversationId)
      .single();
    if (convErr || !conv)
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    if (conv.user_id !== session.user_id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await supabaseAdmin
      .from("chat_conversations")
      .delete()
      .eq("id", conversationId);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 },
    );
  }
}
