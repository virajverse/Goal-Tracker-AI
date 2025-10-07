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
    const habit_type = searchParams.get("type"); // good|bad
    const active = searchParams.get("active"); // 'true'|'false'

    let query = supabaseAdmin
      .from("habits")
      .select("*")
      .eq("user_id", session.user_id)
      .order("created_at", { ascending: false });

    if (habit_type) query = query.eq("habit_type", habit_type);
    if (active === "true") query = query.eq("is_active", true);
    if (active === "false") query = query.eq("is_active", false);

    const { data, error } = await query;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ habits: data || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : null;
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to fetch habits" },
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
    let name: string | undefined;
    let habitType: "good" | "bad" | undefined;
    let frequency: "daily" | "weekly" | "monthly" | undefined;
    let isActive: boolean | undefined;
    if (raw && typeof raw === "object") {
      const b = raw as {
        name?: unknown;
        habit_type?: unknown;
        frequency?: unknown;
        is_active?: unknown;
      };
      if (typeof b.name === "string") name = b.name;
      if (b.habit_type === "good" || b.habit_type === "bad")
        habitType = b.habit_type;
      if (
        b.frequency === "daily" ||
        b.frequency === "weekly" ||
        b.frequency === "monthly"
      )
        frequency = b.frequency;
      if (typeof b.is_active === "boolean") isActive = b.is_active;
    }
    if (!name || !habitType)
      return NextResponse.json(
        { error: "name and habit_type are required" },
        { status: 400 },
      );

    const record = {
      user_id: session.user_id,
      name,
      habit_type: habitType,
      frequency: frequency ?? "daily",
      is_active: isActive ?? true,
    };

    const { data, error } = await supabaseAdmin
      .from("habits")
      .insert([record])
      .select("*")
      .single();

    if (error || !data)
      return NextResponse.json(
        { error: error?.message || "Failed to create habit" },
        { status: 400 },
      );
    return NextResponse.json({ habit: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : null;
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to create habit" },
      { status: 500 },
    );
  }
}
