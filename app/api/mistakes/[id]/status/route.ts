export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireSession } from '@/lib/auth';

// POST body: { status: 'open' | 'repeated' | 'solved', increment?: boolean, occurred_at?: string }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(req);
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const body = await req.json();
    const { status, increment, occurred_at } = body || {};
    if (!status || !['open', 'repeated', 'solved'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updates: Record<string, any> = { status };
    if (increment) {
      // increment occurrence_count and update last_occurred_at
      updates.occurrence_count = (supabaseAdmin as any).rpc ? undefined : undefined; // placeholder ignored by query builder
    }

    // Fetch existing to compute increment server-side safely
    const { data: existing, error: getErr } = await supabaseAdmin
      .from('mistakes')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user_id)
      .single();
    if (getErr || !existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const payload: any = { status };
    if (increment) {
      payload.occurrence_count = (existing.occurrence_count || 0) + 1;
      payload.last_occurred_at = occurred_at ?? new Date().toISOString().slice(0, 10);
    }

    const { data, error } = await supabaseAdmin
      .from('mistakes')
      .update(payload)
      .eq('id', id)
      .eq('user_id', session.user_id)
      .select('*')
      .single();

    if (error || !data) return NextResponse.json({ error: error?.message || 'Failed to update status' }, { status: 400 });
    return NextResponse.json({ mistake: data });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
