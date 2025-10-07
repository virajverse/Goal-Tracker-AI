export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n),
  );
}
function startOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function startOfWeekMonday(d: Date) {
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  return addDays(d, -diff);
}
function makeRange(range?: string) {
  const now = new Date();
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  let days = 30;
  if (range === "7d" || range === "weekly") days = 7;
  else if (range === "30d" || range === "monthly") days = 30;
  else if (range === "90d") days = 90;
  const start = addDays(end, -(days - 1));
  return { start: fmt(start), end: fmt(end) };
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const { searchParams } = new URL(req.url);
    const bucket = (searchParams.get("bucket") || "daily") as
      | "daily"
      | "weekly"
      | "monthly";
    const range = searchParams.get("range") || undefined; // 7d|30d|90d
    const type = searchParams.get("type") || undefined; // good|bad

    const { start, end } = makeRange(range);

    // Optionally filter logs by habit type by first fetching habit ids
    let habitIds: number[] | null = null;
    if (type === "good" || type === "bad") {
      const { data: habits, error: hErr } = await supabaseAdmin
        .from("habits")
        .select("id")
        .eq("user_id", session.user_id)
        .eq("habit_type", type);
      if (hErr)
        return NextResponse.json({ error: hErr.message }, { status: 400 });
      habitIds = (habits || []).map((h) => h.id as number);
      if (habitIds.length === 0)
        return NextResponse.json({ start, end, bucket, series: [], total: 0 });
    }

    let query = supabaseAdmin
      .from("habit_logs")
      .select("log_date,is_done,habit_id")
      .eq("user_id", session.user_id)
      .gte("log_date", start)
      .lte("log_date", end);
    if (habitIds) query = query.in("habit_id", habitIds);

    const { data, error } = await query;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    const doneDates = new Set<string>(
      (data || []).filter((l) => l.is_done).map((l) => l.log_date as string),
    );

    const map: Record<string, number> = {};
    let cursor = new Date(start + "T00:00:00Z");
    const last = new Date(end + "T00:00:00Z");
    while (cursor <= last) {
      let key = fmt(cursor);
      if (bucket === "weekly") key = fmt(startOfWeekMonday(cursor));
      else if (bucket === "monthly") key = fmt(startOfMonth(cursor));
      map[key] = (map[key] || 0) + (doneDates.has(fmt(cursor)) ? 1 : 0);
      cursor = addDays(cursor, 1);
    }

    const series = Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, done]) => ({ date, done }));

    const total = series.reduce((sum, x) => sum + x.done, 0);

    return NextResponse.json({
      start,
      end,
      bucket,
      type: type || "all",
      series,
      total,
    });
  } catch (err: any) {
    if (err?.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to compute stats" },
      { status: 500 },
    );
  }
}
