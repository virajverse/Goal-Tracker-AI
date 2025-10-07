export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";

// GET: list notes for a project (owned by user)
// POST: add a new note to a project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession(req);
    const { id } = await params;
    const projectId = Number(id);
    if (!Number.isFinite(projectId))
      return NextResponse.json(
        { error: "Invalid project id" },
        { status: 400 },
      );

    // Ensure project belongs to user
    const { data: project, error: pErr } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", session.user_id)
      .single();
    if (pErr || !project)
      return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const { data, error } = await supabaseAdmin
      .from("project_notes")
      .select("*")
      .eq("user_id", session.user_id)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ notes: data || [] });
  } catch (err: any) {
    if (err?.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to fetch project notes" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession(req);
    const { id } = await params;
    const projectId = Number(id);
    if (!Number.isFinite(projectId))
      return NextResponse.json(
        { error: "Invalid project id" },
        { status: 400 },
      );

    const { note_text } = await req.json();
    if (!note_text || typeof note_text !== "string") {
      return NextResponse.json(
        { error: "note_text is required" },
        { status: 400 },
      );
    }

    // Ensure project belongs to user
    const { data: project, error: pErr } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", session.user_id)
      .single();
    if (pErr || !project)
      return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const { data, error } = await supabaseAdmin
      .from("project_notes")
      .insert([{ user_id: session.user_id, project_id: projectId, note_text }])
      .select("*")
      .single();

    if (error || !data)
      return NextResponse.json(
        { error: error?.message || "Failed to add note" },
        { status: 400 },
      );
    return NextResponse.json({ note: data });
  } catch (err: any) {
    if (err?.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
  }
}
