export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const { searchParams } = new URL(req.url);
    const habit_type = searchParams.get('type'); // good|bad
    const active = searchParams.get('active'); // 'true'|'false'

    let query = supabaseAdmin
      .from('habits')
      .select('*')
      .eq('user_id', session.user_id)
      .order('created_at', { ascending: false });

    if (habit_type) query = query.eq('habit_type', habit_type);
    if (active === 'true') query = query.eq('is_active', true);
    if (active === 'false') query = query.eq('is_active', false);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ habits: data || [] });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const body = await req.json();
    const { name, habit_type, frequency, is_active } = body || {};
    if (!name || !habit_type) return NextResponse.json({ error: 'name and habit_type are required' }, { status: 400 });
    if (!['good', 'bad'].includes(habit_type)) return NextResponse.json({ error: 'Invalid habit_type' }, { status: 400 });
    if (frequency && !['daily', 'weekly', 'monthly'].includes(frequency)) return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });

    const record: any = {
      user_id: session.user_id,
      name,
      habit_type,
      frequency: frequency ?? 'daily',
      is_active: is_active ?? true,
    };

    const { data, error } = await supabaseAdmin
      .from('habits')
      .insert([record])
      .select('*')
      .single();

    if (error || !data) return NextResponse.json({ error: error?.message || 'Failed to create habit' }, { status: 400 });
    return NextResponse.json({ habit: data });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to create habit' }, { status: 500 });
  }
}
