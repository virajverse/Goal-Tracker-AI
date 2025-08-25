export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { aiRespond } from '@/lib/ai';

const GENERIC_FALLBACKS = [
  "I'm here to help. Could you share a bit more about what you need?",
  "Let's make progress on your goals. What would you like to focus on today?",
  "Tell me what you're working on, and I'll suggest clear next steps.",
  "What challenge are you facing right now? I can help you move forward.",
];

function getContextualFallback(userGoals: any[], recentActivity: any[]) {
  const hasGoals = userGoals.length > 0;
  const recentCompletions = recentActivity.filter((a: any) => a.is_completed).length;
  const totalRecent = recentActivity.length;

  if (hasGoals && totalRecent > 0) {
    const rate = totalRecent ? Math.round((recentCompletions / totalRecent) * 100) : 0;
    if (rate >= 70) {
      return [
        `Great momentum—${recentCompletions}/${totalRecent} tasks completed recently! Want to push to the next level?`,
        "You're doing excellent. Let's set one stretch goal for this week.",
      ];
    } else if (rate >= 40) {
      return [
        `Solid progress—${recentCompletions}/${totalRecent} completed. What's one small improvement you can make today?`,
        "You're building consistency. Let's pick one manageable task to do now.",
      ];
    } else {
      return [
        `It looks like consistency has been tough—${recentCompletions}/${totalRecent} completed. Want a simple plan to restart?`,
        "No worries—progress isn't linear. Let's choose one tiny task to build momentum.",
      ];
    }
  }

  if (hasGoals) {
    return [
      "You have clear goals. Which one should we prioritize right now?",
      "Let’s pick a small action for one of your goals today.",
    ];
  }

  return GENERIC_FALLBACKS;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let userGoals: any[] = [];
    let recentActivity: any[] = [];

    try {
      const [{ data: goals }, { data: logs }] = await Promise.all([
        supabaseAdmin
          .from('goals')
          .select('title,category,target_frequency')
          .eq('user_id', session.user_id)
          .eq('is_active', true)
          .limit(5),
        supabaseAdmin
          .from('daily_logs')
          .select('goal_id,is_completed,log_date')
          .eq('user_id', session.user_id)
          .gte('log_date', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
          .order('log_date', { ascending: false })
          .limit(10),
      ]);
      userGoals = goals || [];
      recentActivity = logs || [];
    } catch {
      // Continue with empty arrays if database fails
    }

    // Try AI via unified helper (auto-resolves provider and enforces policy)
    let contextualInfo = '';
    if (userGoals.length > 0) {
      contextualInfo += "\nUser's current goals: " + userGoals.map((g: any) => g.title).join(', ');
    }
    if (recentActivity.length > 0) {
      const recentCompletions = recentActivity.filter((a: any) => a.is_completed).length;
      contextualInfo += `\nRecent activity: ${recentCompletions}/${recentActivity.length} tasks completed in last 3 days`;
    }

    const timestamp = new Date().toISOString();
    const systemPrompt = `You are an intelligent, empathetic AI assistant specializing in goal tracking, productivity, and personal development. Be helpful, practical, and motivational. Use the user's context when available. If the request is unclear, ask a brief clarifying question before giving actionable next steps. Keep responses concise.`;

    try {
      const ai = await aiRespond({
        userMessage: message,
        context: `Time: ${timestamp}${contextualInfo}`,
        systemPrompt,
        maxTokens: 250,
        temperature: 0.7,
      });
      if (ai) return NextResponse.json({ response: ai });
    } catch {
      // continue to fallback
    }

    // Fallbacks (English only)
    const candidates = getContextualFallback(userGoals, recentActivity);
    const response = candidates[Math.floor(Math.random() * candidates.length)] || GENERIC_FALLBACKS[0];
    return NextResponse.json({ response });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
}
