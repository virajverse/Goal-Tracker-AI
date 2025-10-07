export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    let query = supabaseAdmin
      .from("daily_logs")
      .select("*")
      .eq("user_id", session.user_id)
      .order("log_date", { ascending: false });
    if (date) {
      query = query.eq("log_date", date);
    }
    const { data, error } = await query;

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ logs: data || [] });
  } catch (err: any) {
    if (err?.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to fetch daily logs" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const { goal_id, log_date, is_completed, notes } = await req.json();
    if (!goal_id || !log_date || typeof is_completed !== "boolean") {
      return NextResponse.json(
        { error: "goal_id, log_date and is_completed are required" },
        { status: 400 },
      );
    }

    // Check if a log exists for this goal and date
    const { data: existing, error: selectError } = await supabaseAdmin
      .from("daily_logs")
      .select("*")
      .eq("user_id", session.user_id)
      .eq("goal_id", goal_id)
      .eq("log_date", log_date)
      .maybeSingle();

    if (selectError && selectError.code !== "PGRST116") {
      return NextResponse.json({ error: selectError.message }, { status: 400 });
    }

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from("daily_logs")
        .update({ is_completed, notes: notes ?? existing.notes })
        .eq("id", existing.id)
        .eq("user_id", session.user_id)
        .select("*")
        .single();
      if (error || !data)
        return NextResponse.json(
          { error: error?.message || "Failed to update log" },
          { status: 400 },
        );
      return NextResponse.json({ log: data });
    } else {
      const { data, error } = await supabaseAdmin
        .from("daily_logs")
        .insert([
          {
            goal_id,
            log_date,
            is_completed,
            notes: notes ?? null,
            user_id: session.user_id,
          },
        ])
        .select("*")
        .single();
      if (error || !data)
        return NextResponse.json(
          { error: error?.message || "Failed to create log" },
          { status: 400 },
        );
      return NextResponse.json({ log: data });
    }
  } catch (err: any) {
    if (err?.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to save daily log" },
      { status: 500 },
    );
  }
}
