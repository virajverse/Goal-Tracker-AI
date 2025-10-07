export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);

    const { data: goals, error: goalsError } = await supabaseAdmin
      .from("goals")
      .select("id,title,category,target_frequency")
      .eq("user_id", session.user_id)
      .eq("is_active", true);

    if (goalsError)
      return NextResponse.json({ error: goalsError.message }, { status: 400 });

    const goalIds = (goals || []).map((g) => g.id);
    let logs: { goal_id: number; is_completed: boolean }[] = [];
    if (goalIds.length > 0) {
      const { data: logData, error: logsError } = await supabaseAdmin
        .from("daily_logs")
        .select("goal_id,is_completed")
        .eq("user_id", session.user_id)
        .in("goal_id", goalIds);
      if (logsError)
        return NextResponse.json({ error: logsError.message }, { status: 400 });
      logs = (logData || []) as any[];
    }

    const byGoal = new Map<number, { total: number; completed: number }>();
    for (const id of goalIds) byGoal.set(id, { total: 0, completed: 0 });
    for (const l of logs) {
      const entry = byGoal.get(l.goal_id) || { total: 0, completed: 0 };
      entry.total += 1;
      if (l.is_completed) entry.completed += 1;
      byGoal.set(l.goal_id, entry);
    }

    const goalStats = (goals || []).map((g) => {
      const v = byGoal.get(g.id) || { total: 0, completed: 0 };
      const completion_rate = v.total
        ? Math.round((v.completed / v.total) * 100)
        : 0;
      return {
        id: g.id,
        title: g.title,
        category: g.category,
        target_frequency: g.target_frequency,
        total_logs: v.total,
        completed_count: v.completed,
        completion_rate,
      };
    });

    return NextResponse.json({ goalStats });
  } catch (err: any) {
    if (err?.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to fetch goal analytics" },
      { status: 500 },
    );
  }
}
