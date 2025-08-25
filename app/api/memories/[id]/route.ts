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
    const allowed = ['title', 'content', 'mood_tag', 'memory_date', 'image_path'];
    const updates: Record<string, any> = {};
    for (const key of allowed) if (body[key] !== undefined) updates[key] = body[key];
    if (updates.mood_tag && !['happy', 'sad', 'success', 'failure'].includes(updates.mood_tag)) {
      return NextResponse.json({ error: 'Invalid mood_tag' }, { status: 400 });
    }
    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('memories')
      .update(updates)
      .eq('id', id)
      .eq('user_id', session.user_id)
      .select('*')
      .single();

    if (error || !data) return NextResponse.json({ error: error?.message || 'Failed to update memory' }, { status: 400 });
    return NextResponse.json({ memory: data });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(req);
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('memories')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
  }
}
