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
      .from('projects')
      .select('*')
      .eq('user_id', session.user_id)
      .order('priority', { ascending: true })
      .order('deadline', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ projects: data || [] });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const body = await req.json();
    const { title, description, status, deadline, tech_stack, priority } = body || {};
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    if (status && !['upcoming', 'ongoing', 'completed', 'archived'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    if (priority && (priority < 1 || priority > 3)) {
      return NextResponse.json({ error: 'Priority must be 1..3' }, { status: 400 });
    }
    if (tech_stack && !Array.isArray(tech_stack)) {
      return NextResponse.json({ error: 'tech_stack must be an array of strings' }, { status: 400 });
    }

    const record: any = {
      user_id: session.user_id,
      title,
      description: description ?? null,
      status: status ?? 'upcoming',
      tech_stack: Array.isArray(tech_stack) ? tech_stack : [],
      priority: priority ?? 2,
    };
    if (deadline) record.deadline = deadline;

    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert([record])
      .select('*')
      .single();

    if (error || !data) return NextResponse.json({ error: error?.message || 'Failed to create project' }, { status: 400 });
    return NextResponse.json({ project: data });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
