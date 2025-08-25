export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const { data, error } = await supabaseAdmin
      .from('goals')
      .select('*')
      .eq('user_id', session.user_id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ goals: data || [] });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const body = await req.json();
    const { title, description, category, target_frequency } = body || {};
    if (!title || !target_frequency) {
      return NextResponse.json({ error: 'Title and target_frequency are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('goals')
      .insert([
        {
          title,
          description: description ?? null,
          category: category ?? null,
          target_frequency,
          is_active: true,
          user_id: session.user_id,
        },
      ])
      .select('*')
      .single();

    if (error || !data) return NextResponse.json({ error: error?.message || 'Failed to create goal' }, { status: 400 });
    return NextResponse.json({ goal: data });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}
