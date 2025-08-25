export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireSession } from '@/lib/auth';

function monthRange(month?: string) {
  // month format: YYYY-MM
  let start: Date;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    start = new Date(`${month}-01T00:00:00.000Z`);
  } else {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    start = new Date(`${y}-${m}-01T00:00:00.000Z`);
  }
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)); // last day 00:00Z
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || undefined;
    const { start, end } = monthRange(month);

    const { data, error } = await supabaseAdmin
      .from('memories')
      .select('memory_date')
      .eq('user_id', session.user_id)
      .gte('memory_date', start)
      .lte('memory_date', end);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const counts: Record<string, number> = {};
    for (const row of data || []) {
      const d = row.memory_date as string;
      counts[d] = (counts[d] || 0) + 1;
    }

    return NextResponse.json({ start, end, counts });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to build calendar' }, { status: 500 });
  }
}
