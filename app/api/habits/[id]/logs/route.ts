export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireSession } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(req);
    const { id } = await params;
    const habitId = Number(id);
    if (!Number.isFinite(habitId)) return NextResponse.json({ error: 'Invalid habit id' }, { status: 400 });
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    let query = supabaseAdmin
      .from('habit_logs')
      .select('*')
      .eq('user_id', session.user_id)
      .eq('habit_id', habitId)
      .order('log_date', { ascending: false });

    if (start) query = query.gte('log_date', start);
    if (end) query = query.lte('log_date', end);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ logs: data || [] });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(req);
    const { id } = await params;
    const habitId = Number(id);
    if (!Number.isFinite(habitId)) return NextResponse.json({ error: 'Invalid habit id' }, { status: 400 });

    const body = await req.json();
    const { date, is_done } = body || {};
    if (!date) return NextResponse.json({ error: 'date is required (YYYY-MM-DD)' }, { status: 400 });

    const record = {
      user_id: session.user_id,
      habit_id: habitId,
      log_date: date,
      is_done: is_done ?? true,
    };

    const { data, error } = await supabaseAdmin
      .from('habit_logs')
      .upsert([record], { onConflict: 'user_id,habit_id,log_date' })
      .select('*')
      .single();

    if (error || !data) return NextResponse.json({ error: error?.message || 'Failed to upsert log' }, { status: 400 });
    return NextResponse.json({ log: data });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to upsert log' }, { status: 500 });
  }
}
