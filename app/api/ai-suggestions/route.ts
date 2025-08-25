export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { generateText } from '@/lib/gemini';

function buildSystemPrompt(type?: string) {
  switch (type) {
    case 'motivation':
      return 'You are an inspiring motivational coach. Generate unique, personalized motivational messages based on the user\'s specific goals and recent progress. Vary your approach. Keep responses 2-3 sentences max.';
    case 'tip':
      return 'You are a productivity expert. Provide specific, actionable tips based on the user\'s goals and patterns. Keep responses 2-3 sentences max.';
    case 'reminder':
      return 'You are a supportive reminder assistant. Create personalized reminders referencing specific goals and patterns when possible. Keep responses 2-3 sentences max.';
    case 'health':
      return 'You are a wellness coach. Provide practical health and wellness suggestions spanning nutrition, exercise, sleep, stress. Keep responses 2-3 sentences max.';
    case 'productivity':
      return 'You are a productivity strategist. Offer diverse, actionable strategies to improve focus and output. Keep responses 2-3 sentences max.';
    case 'mindfulness':
      return 'You are a mindfulness coach. Suggest practical mindfulness and stress reduction practices that fit daily routines. Keep responses 2-3 sentences max.';
    default:
      return 'You are a versatile goal tracking assistant. Analyze the user\'s goals and recent progress to provide contextual guidance. Mix motivational and strategic advice. Keep responses 2-3 sentences max.';
  }
}

const FALLBACKS: Record<string, string[]> = {
  motivation: [
    'Your progress matters more than perfection. Keep going!',
    "Every small step you take brings you closer to your goals.",
    'You\'ve started something meaningful—stay consistent and trust the process.',
    'Progress isn\'t always visible, but it compounds. Show up today.'
  ],
  tip: [
    'Break your largest goal into 3 smaller tasks you can do this week.',
    'Set a specific daily time for goal-related work to build routine.',
    'Use the 2-minute rule: if it takes less than 2 minutes, do it now.',
    'Review your progress weekly and double down on what works.'
  ],
  reminder: [
    'Take a quick moment to review your goals—small adjustments lead to big results.',
    'Which goal will you give attention to today? Choose one and start.',
    'Celebrate a recent win, then plan your next step.',
    'Check your priorities—are your actions aligned with your goals?'
  ],
  health: [
    'Drink water and take a 5-minute walk to reset your energy.',
    'Aim for consistent sleep. A rested mind performs better.',
    'Plan a protein-rich meal to keep your energy stable.',
    'Schedule a short stretch session between tasks to reduce tension.'
  ],
  productivity: [
    'Time-block your top 1–2 priorities and protect that focus window.',
    'Batch similar tasks to reduce context switching.',
    'Prepare your workspace the night before to lower friction.',
    'Use accountability—share your goal with a trusted friend.'
  ],
  mindfulness: [
    'Try a 3-minute breathing exercise before your next task.',
    'Do a quick body scan to relax tension and improve focus.',
    'Step away from the screen and take 5 mindful breaths.',
    'Observe your thoughts without judgment for one minute.'
  ],
  general: [
    'Focus on progress, not perfection. Every step counts.',
    'Consistency beats intensity—show up briefly but daily.',
    'You have everything you need to move forward today.',
    'Turn your goals into habits, and success becomes inevitable.'
  ]
};

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    const body = await req.json().catch(() => ({}));
    const { context, type } = (body || {}) as { context?: string; type?: string };

    // Fetch context from Supabase (only if logged in)
    let goals: any[] | null = null;
    let recentLogs: any[] | null = null;
    if (session?.user_id) {
      const [goalsResp, logsResp] = await Promise.all([
        supabaseAdmin
          .from('goals')
          .select('title,category,target_frequency')
          .eq('user_id', session.user_id)
          .eq('is_active', true)
          .limit(8),
        supabaseAdmin
          .from('daily_logs')
          .select('goal_id,is_completed,log_date')
          .eq('user_id', session.user_id)
          .gte('log_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
          .order('log_date', { ascending: false })
          .limit(10),
      ]);
      goals = goalsResp.data || [];
      recentLogs = logsResp.data || [];
    }

    let suggestionText: string | null = null;

    try {
      // Build a single prompt for Gemini
      let contextPrompt = "User's current goals:\n";
      (goals || []).forEach((g) => {
        contextPrompt += `- ${g.title}${g.category ? ` (${g.category})` : ''}${g.target_frequency ? `, ${g.target_frequency}` : ''}\n`;
      });
      if ((recentLogs || []).length > 0) {
        contextPrompt += '\nRecent completion history (last 7 days):\n';
        (recentLogs || []).slice(0, 10).forEach((l: any) => {
          contextPrompt += `- ${l.log_date}: ${l.is_completed ? '✓ completed' : '✗ not completed'}\n`;
        });
      }
      if (context) contextPrompt += `\nUser context: ${context}\n`;

      const systemPrompt = buildSystemPrompt(type);
      const fullPrompt = `${systemPrompt}\n\n${contextPrompt}\n\nRespond in 2-3 sentences.`;
      suggestionText = (await generateText({ prompt: fullPrompt, maxOutputTokens: 150, temperature: 0.9 })).trim();
    } catch {
      suggestionText = null;
    }

    if (!suggestionText) {
      const key = type && FALLBACKS[type] ? type : 'general';
      const arr = FALLBACKS[key];
      suggestionText = arr[Math.floor(Math.random() * arr.length)];
    }

    // If not logged in, return ephemeral suggestion without saving
    if (!session?.user_id) {
      const now = new Date().toISOString();
      return NextResponse.json({
        suggestion: {
          id: -1,
          suggestion_text: suggestionText,
          suggestion_type: type || 'general',
          is_used: false,
          created_at: now,
          updated_at: now,
        },
      }, { status: 201 });
    }

    // Save for logged-in users
    const { data, error } = await supabaseAdmin
      .from('ai_suggestions')
      .insert([
        {
          suggestion_text: suggestionText,
          suggestion_type: type || 'general',
          user_id: session.user_id,
        },
      ])
      .select('*')
      .single();

    if (error || !data) return NextResponse.json({ error: error?.message || 'Failed to save suggestion' }, { status: 400 });
    return NextResponse.json({ suggestion: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to generate suggestion' }, { status: 500 });
  }
}
