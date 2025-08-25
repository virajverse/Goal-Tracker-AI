export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { aiRespond } from '@/lib/ai';

async function loadUserContext(userId: string) {
  try {
    const [{ data: goals }, { data: logs }] = await Promise.all([
      supabaseAdmin
        .from('goals')
        .select('title,category,target_frequency')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(5),
      supabaseAdmin
        .from('daily_logs')
        .select('goal_id,is_completed,log_date')
        .eq('user_id', userId)
        .gte('log_date', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
        .order('log_date', { ascending: false })
        .limit(10),
    ]);
    return { goals: goals || [], logs: logs || [] };
  } catch {
    return { goals: [], logs: [] };
  }
}

function buildContextualInfo(goals: any[], logs: any[]) {
  let contextualInfo = '';
  if (goals.length > 0) {
    contextualInfo += "\nUser's current goals: " + goals.map((g: any) => g.title).join(', ');
  }
  if (logs.length > 0) {
    const recentCompletions = logs.filter((a: any) => a.is_completed).length;
    contextualInfo += `\nRecent activity: ${recentCompletions}/${logs.length} tasks completed in last 3 days`;
  }
  return contextualInfo;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(req);
    const { id } = await params;
    const conversationId = Number(id);
    if (!conversationId || Number.isNaN(conversationId)) {
      return NextResponse.json({ error: 'Invalid conversation id' }, { status: 400 });
    }

    // Ownership check
    const { data: conv, error: convErr } = await supabaseAdmin
      .from('chat_conversations')
      .select('id,user_id')
      .eq('id', conversationId)
      .single();
    if (convErr || !conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    if (conv.user_id !== session.user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: messages, error } = await supabaseAdmin
      .from('chat_messages')
      .select('id,role,content,created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ messages: messages || [] });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(req);
    const { id } = await params;
    const conversationId = Number(id);
    const { content } = await req.json();

    if (!conversationId || Number.isNaN(conversationId)) {
      return NextResponse.json({ error: 'Invalid conversation id' }, { status: 400 });
    }
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Ownership check
    const { data: conv, error: convErr } = await supabaseAdmin
      .from('chat_conversations')
      .select('id,user_id,title')
      .eq('id', conversationId)
      .single();
    if (convErr || !conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    if (conv.user_id !== session.user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Insert user message
    const { data: userMsg, error: userErr } = await supabaseAdmin
      .from('chat_messages')
      .insert([{ conversation_id: conversationId, user_id: session.user_id, role: 'user', content }])
      .select('id,role,content,created_at')
      .single();
    if (userErr || !userMsg) return NextResponse.json({ error: userErr?.message || 'Failed to save message' }, { status: 400 });

    // Auto-title if missing
    if (!conv.title) {
      const title = content.trim().slice(0, 80);
      await supabaseAdmin
        .from('chat_conversations')
        .update({ title })
        .eq('id', conversationId);
    }

    // Build AI response using unified helper
    const { goals, logs } = await loadUserContext(session.user_id);
    const contextualInfo = buildContextualInfo(goals, logs);
    const timestamp = new Date().toISOString();

    const systemPrompt = `You are an intelligent, empathetic AI assistant specializing in goal tracking, productivity, and personal development. Be helpful, practical, and motivational. Use the user's context when available. If the request is unclear, ask a brief clarifying question before giving actionable next steps. Keep responses concise.`;

    let assistantText: string | null = null;
    try {
      const raw = await aiRespond({
        userMessage: content,
        context: `Time: ${timestamp}${contextualInfo}`,
        systemPrompt,
        maxTokens: 250,
        temperature: 0.7,
      });
      assistantText = raw?.trim() || null;
    } catch {
      assistantText = null;
    }

    if (!assistantText) {
      // Fallbacks
      const hasGoals = goals.length > 0;
      const recentCompletions = logs.filter((a: any) => a.is_completed).length;
      const totalRecent = logs.length;
      let fallback = "I'm here to help. Could you share a bit more about what you need?";
      if (hasGoals && totalRecent > 0) {
        const rate = totalRecent ? Math.round((recentCompletions / totalRecent) * 100) : 0;
        if (rate >= 70) fallback = `Great momentum—${recentCompletions}/${totalRecent} tasks completed recently! Want to push to the next level?`;
        else if (rate >= 40) fallback = `Solid progress—${recentCompletions}/${totalRecent} completed. What's one small improvement you can make today?`;
        else fallback = `It looks like consistency has been tough—${recentCompletions}/${totalRecent} completed. Want a simple plan to restart?`;
      } else if (hasGoals) {
        fallback = 'You have clear goals. Which one should we prioritize right now?';
      }
      assistantText = fallback;
    }

    // Save assistant message
    const { data: asstMsg, error: asstErr } = await supabaseAdmin
      .from('chat_messages')
      .insert([{ conversation_id: conversationId, user_id: session.user_id, role: 'assistant', content: assistantText }])
      .select('id,role,content,created_at')
      .single();
    if (asstErr || !asstMsg) return NextResponse.json({ error: asstErr?.message || 'Failed to save assistant message' }, { status: 400 });

    // Touch conversation updated_at
    await supabaseAdmin
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return NextResponse.json({ response: assistantText, conversationId });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}
