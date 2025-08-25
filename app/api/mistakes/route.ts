export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('mistakes')
      .select('*')
      .eq('user_id', session.user_id)
      .order('last_occurred_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ mistakes: data || [] });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to fetch mistakes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const body = await req.json();
    const { title, description, lesson_learned, status, last_occurred_at } = body || {};
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    if (status && !['open', 'repeated', 'solved'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const record: any = {
      user_id: session.user_id,
      title,
      description: description ?? null,
      lesson_learned: lesson_learned ?? null,
      status: status ?? 'open',
    };
    if (last_occurred_at) record.last_occurred_at = last_occurred_at;

    const { data, error } = await supabaseAdmin
      .from('mistakes')
      .insert([record])
      .select('*')
      .single();

    if (error || !data) return NextResponse.json({ error: error?.message || 'Failed to create mistake' }, { status: 400 });
    return NextResponse.json({ mistake: data });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to create mistake' }, { status: 500 });
  }
}
