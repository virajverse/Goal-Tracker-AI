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
    const mood = searchParams.get("mood");
    const start = searchParams.get("start"); // YYYY-MM-DD
    const end = searchParams.get("end"); // YYYY-MM-DD

    let query = supabaseAdmin
      .from("memories")
      .select("*")
      .eq("user_id", session.user_id)
      .order("memory_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (mood) query = query.eq("mood_tag", mood);
    if (start) query = query.gte("memory_date", start);
    if (end) query = query.lte("memory_date", end);

    const { data, error } = await query;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ memories: data || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : null;
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to fetch memories" },
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
    let content: string | undefined;
    let mood_tag: "happy" | "sad" | "success" | "failure" | undefined;
    let memory_date: string | undefined;
    let image_path: string | undefined;
    if (raw && typeof raw === "object") {
      const b = raw as {
        title?: unknown;
        content?: unknown;
        mood_tag?: unknown;
        memory_date?: unknown;
        image_path?: unknown;
      };
      if (typeof b.title === "string") title = b.title;
      if (typeof b.content === "string") content = b.content;
      if (
        b.mood_tag === "happy" ||
        b.mood_tag === "sad" ||
        b.mood_tag === "success" ||
        b.mood_tag === "failure"
      )
        mood_tag = b.mood_tag;
      if (typeof b.memory_date === "string") memory_date = b.memory_date;
      if (typeof b.image_path === "string") image_path = b.image_path;
    }
    if (!content)
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 },
      );
    if (
      mood_tag &&
      !["happy", "sad", "success", "failure"].includes(mood_tag)
    ) {
      return NextResponse.json({ error: "Invalid mood_tag" }, { status: 400 });
    }

    const record: Record<string, unknown> = {
      user_id: session.user_id,
      title: title ?? null,
      content,
      mood_tag: mood_tag ?? null,
      image_path: image_path ?? null,
      ...(memory_date ? { memory_date } : {}),
    };

    const { data, error } = await supabaseAdmin
      .from("memories")
      .insert([record])
      .select("*")
      .single();

    if (error || !data)
      return NextResponse.json(
        { error: error?.message || "Failed to create memory" },
        { status: 400 },
      );
    return NextResponse.json({ memory: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : null;
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to create memory" },
      { status: 500 },
    );
  }
}
