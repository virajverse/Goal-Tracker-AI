export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireSession } from '@/lib/auth';

function defaultRange(range?: string) {
  // range: 'weekly' | 'monthly' | '90d'
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let days = 30;
  if (range === 'weekly') days = 7;
  else if (range === 'monthly') days = 30;
  else if (range === '90d') days = 90;
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (days - 1));
  const s = start.toISOString().slice(0, 10);
  const e = end.toISOString().slice(0, 10);
  return { start: s, end: e };
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || undefined; // weekly|monthly|90d
    const { start, end } = defaultRange(range);

    const { data, error } = await supabaseAdmin
      .from('mistakes')
      .select('last_occurred_at')
      .eq('user_id', session.user_id)
      .gte('last_occurred_at', start)
      .lte('last_occurred_at', end);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const counts: Record<string, number> = {};
    for (const row of data || []) {
      const d = row.last_occurred_at as string;
      if (d) counts[d] = (counts[d] || 0) + 1;
    }

    return NextResponse.json({ start, end, counts });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to compute analytics' }, { status: 500 });
  }
}
