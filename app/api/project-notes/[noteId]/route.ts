export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> },
) {
  try {
    const session = await requireSession(req);
    const { noteId: noteIdStr } = await params;
    const noteId = Number(noteIdStr);
    if (!Number.isFinite(noteId))
      return NextResponse.json({ error: "Invalid note id" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("project_notes")
      .delete()
      .eq("id", noteId)
      .eq("user_id", session.user_id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 },
    );
  }
}
