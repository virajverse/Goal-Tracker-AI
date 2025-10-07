export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let query = supabaseAdmin
      .from("projects")
      .select("*")
      .eq("user_id", session.user_id)
      .order("priority", { ascending: true })
      .order("deadline", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ projects: data || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : null;
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession(req);
    let raw: unknown = null;
    try {
      raw = await req.json();
    } catch {}
    let title: string | undefined;
    let description: string | undefined;
    let statusVal:
      | "upcoming"
      | "ongoing"
      | "completed"
      | "archived"
      | undefined;
    let deadline: string | undefined;
    let techStack: string[] | undefined;
    let priorityVal: number | undefined;
    if (raw && typeof raw === "object") {
      const b = raw as {
        title?: unknown;
        description?: unknown;
        status?: unknown;
        deadline?: unknown;
        tech_stack?: unknown;
        priority?: unknown;
      };
      if (typeof b.title === "string") title = b.title;
      if (typeof b.description === "string") description = b.description;
      if (
        b.status === "upcoming" ||
        b.status === "ongoing" ||
        b.status === "completed" ||
        b.status === "archived"
      )
        statusVal = b.status;
      if (typeof b.deadline === "string") deadline = b.deadline;
      if (
        Array.isArray(b.tech_stack) &&
        b.tech_stack.every((t) => typeof t === "string")
      )
        techStack = b.tech_stack;
      if (typeof b.priority === "number") priorityVal = b.priority;
    }
    if (!title)
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (priorityVal !== undefined && (priorityVal < 1 || priorityVal > 3)) {
      return NextResponse.json(
        { error: "Priority must be 1..3" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("projects")
      .insert([
        {
          user_id: session.user_id,
          title,
          description: description ?? null,
          status: statusVal ?? "upcoming",
          tech_stack: techStack ?? [],
          priority: priorityVal ?? 2,
          ...(deadline ? { deadline } : {}),
        },
      ])
      .select("*")
      .single();

    if (error || !data)
      return NextResponse.json(
        { error: error?.message || "Failed to create project" },
        { status: 400 },
      );
    return NextResponse.json({ project: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : null;
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }
}
