export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession(req);
    const { data, error } = await supabaseAdmin
      .from("goals")
      .select("*")
      .eq("user_id", session.user_id)
      .order("created_at", { ascending: false });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ goals: data || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : null;
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to fetch goals" },
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
    let category: string | undefined;
    let target_frequency: string | undefined;
    if (raw && typeof raw === "object") {
      const b = raw as {
        title?: unknown;
        description?: unknown;
        category?: unknown;
        target_frequency?: unknown;
      };
      if (typeof b.title === "string") title = b.title;
      if (typeof b.description === "string") description = b.description;
      if (typeof b.category === "string") category = b.category;
      if (typeof b.target_frequency === "string")
        target_frequency = b.target_frequency;
    }
    if (!title || !target_frequency) {
      return NextResponse.json(
        { error: "Title and target_frequency are required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("goals")
      .insert([
        {
          title,
          description: description ?? null,
          category: category ?? null,
          target_frequency,
          is_active: true,
          user_id: session.user_id,
        },
      ])
      .select("*")
      .single();

    if (error || !data)
      return NextResponse.json(
        { error: error?.message || "Failed to create goal" },
        { status: 400 },
      );
    return NextResponse.json({ goal: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : null;
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to create goal" },
      { status: 500 },
    );
  }
}
