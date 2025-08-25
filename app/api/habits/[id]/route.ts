export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireSession } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(req);
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const body = await req.json();
    const allowed = ['name', 'habit_type', 'frequency', 'is_active'];
    const updates: Record<string, any> = {};
    for (const key of allowed) if (body[key] !== undefined) updates[key] = body[key];

    if (updates.habit_type && !['good', 'bad'].includes(updates.habit_type)) {
      return NextResponse.json({ error: 'Invalid habit_type' }, { status: 400 });
    }
    if (updates.frequency && !['daily', 'weekly', 'monthly'].includes(updates.frequency)) {
      return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
    }
    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('habits')
      .update(updates)
      .eq('id', id)
      .eq('user_id', session.user_id)
      .select('*')
      .single();

    if (error || !data) return NextResponse.json({ error: error?.message || 'Failed to update habit' }, { status: 400 });
    return NextResponse.json({ habit: data });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to update habit' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(req);
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('habits')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to delete habit' }, { status: 500 });
  }
}
