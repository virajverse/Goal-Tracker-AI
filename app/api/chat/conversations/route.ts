export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);

    const { data, error } = await supabaseAdmin
      .from('chat_conversations')
      .select('id,title,created_at,updated_at')
      .eq('user_id', session.user_id)
      .order('updated_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ conversations: data || [] });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const body = await req.json();
    const rawTitle = (body?.title as string | undefined) || '';
    const title = rawTitle.trim().slice(0, 120) || 'New chat';

    const { data, error } = await supabaseAdmin
      .from('chat_conversations')
      .insert([{ user_id: session.user_id, title }])
      .select('id,title,created_at,updated_at')
      .single();

    if (error || !data) return NextResponse.json({ error: error?.message || 'Failed to create conversation' }, { status: 400 });
    return NextResponse.json({ conversation: data });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
