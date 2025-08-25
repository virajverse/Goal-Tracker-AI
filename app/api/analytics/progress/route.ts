export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const { searchParams } = new URL(req.url);
    const days = Math.max(1, Math.min(180, parseInt(searchParams.get('days') || '30', 10)));

    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - days + 1);

    const startStr = formatDate(start);
    const endStr = formatDate(today);

    const { data, error } = await supabaseAdmin
      .from('daily_logs')
      .select('log_date,is_completed')
      .eq('user_id', session.user_id)
      .gte('log_date', startStr)
      .lte('log_date', endStr);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const map = new Map<string, { total: number; completed: number }>();
    // Initialize all days
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      map.set(formatDate(d), { total: 0, completed: 0 });
    }
    for (const row of data || []) {
      const key = row.log_date as string;
      const entry = map.get(key) || { total: 0, completed: 0 };
      entry.total += 1;
      if (row.is_completed) entry.completed += 1;
      map.set(key, entry);
    }

    const progress = Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([log_date, v]) => ({
        log_date,
        total_tasks: v.total,
        completed_tasks: v.completed,
        completion_rate: v.total ? Math.round((v.completed / v.total) * 100) : 0,
      }));

    return NextResponse.json({ progress });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to fetch progress data' }, { status: 500 });
  }
}
