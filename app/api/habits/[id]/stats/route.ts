export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireSession } from '@/lib/auth';

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const nd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
  return nd;
}
function startOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function startOfWeekMonday(d: Date) {
  const day = d.getUTCDay(); // 0 Sun..6 Sat
  const diff = (day + 6) % 7; // Mon=0
  return addDays(d, -diff);
}
function makeRange(range?: string) {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let days = 30;
  if (range === '7d' || range === 'weekly') days = 7;
  else if (range === '30d' || range === 'monthly') days = 30;
  else if (range === '90d') days = 90;
  const start = addDays(end, -(days - 1));
  return { start: fmt(start), end: fmt(end) };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(req);
    const { id } = await params;
    const habitId = Number(id);
    if (!Number.isFinite(habitId)) return NextResponse.json({ error: 'Invalid habit id' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const bucket = (searchParams.get('bucket') || 'daily') as 'daily' | 'weekly' | 'monthly';
    const range = searchParams.get('range') || undefined; // 7d|30d|90d

    // Ensure habit belongs to user
    const { data: habit, error: habitErr } = await supabaseAdmin
      .from('habits')
      .select('*')
      .eq('id', habitId)
      .eq('user_id', session.user_id)
      .single();
    if (habitErr || !habit) return NextResponse.json({ error: 'Habit not found' }, { status: 404 });

    const { start, end } = makeRange(range);
    const { data: logs, error } = await supabaseAdmin
      .from('habit_logs')
      .select('log_date,is_done')
      .eq('user_id', session.user_id)
      .eq('habit_id', habitId)
      .gte('log_date', start)
      .lte('log_date', end);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Aggregate
    const map: Record<string, number> = {};
    const doneSet = new Set((logs || []).filter(l => l.is_done).map(l => l.log_date as string));

    let cursor = new Date(start + 'T00:00:00Z');
    const last = new Date(end + 'T00:00:00Z');
    while (cursor <= last) {
      let key = fmt(cursor);
      if (bucket === 'weekly') key = fmt(startOfWeekMonday(cursor));
      else if (bucket === 'monthly') key = fmt(startOfMonth(cursor));
      map[key] = map[key] || 0;
      // count done on that exact day
      if (bucket === 'daily') {
        map[key] += doneSet.has(fmt(cursor)) ? 1 : 0;
      } else if (bucket === 'weekly') {
        map[key] += doneSet.has(fmt(cursor)) ? 1 : 0;
      } else if (bucket === 'monthly') {
        map[key] += doneSet.has(fmt(cursor)) ? 1 : 0;
      }
      cursor = addDays(cursor, 1);
    }

    const series = Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, done]) => ({ date, done }));

    // Streak calculation based on bucket and habit.frequency
    let streak = 0;
    if (bucket === 'daily') {
      // count backwards consecutive days with done
      let d = new Date(end + 'T00:00:00Z');
      while (fmt(d) in map && map[fmt(d)] > 0) {
        streak += 1;
        d = addDays(d, -1);
      }
    } else if (bucket === 'weekly') {
      // consecutive weeks (Mon anchors) with at least one done
      const weekStep = (dt: Date) => addDays(startOfWeekMonday(dt), -7);
      let d = startOfWeekMonday(new Date(end + 'T00:00:00Z'));
      while (map[fmt(d)] && map[fmt(d)] > 0) {
        streak += 1;
        d = weekStep(d);
      }
    } else if (bucket === 'monthly') {
      // consecutive months with at least one done
      const monthStep = (dt: Date) => new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() - 1, 1));
      let d = startOfMonth(new Date(end + 'T00:00:00Z'));
      while (map[fmt(d)] && map[fmt(d)] > 0) {
        streak += 1;
        d = monthStep(d);
      }
    }

    return NextResponse.json({ start, end, bucket, series, streak });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to compute stats' }, { status: 500 });
  }
}
