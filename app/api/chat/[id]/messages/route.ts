export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { aiRespond } from "@/lib/ai";
import { ruleBasedCoach } from "@/lib/rule_coach";
import { getUserPreferences } from "@/lib/preferences";
import { summarizeConversation } from "@/lib/summarize";

type Lang = "en" | "hi" | "hinglish";

function detectLanguage(text: string): Lang {
  try {
    if (/[\u0900-\u097F]/.test(text)) return "hi"; // Devanagari
    const lower = text.toLowerCase();
    const hints = [
      "kya",
      "hai",
      "kr",
      "kar",
      "nahi",
      "ni",
      "chahiye",
      "krna",
      "kro",
      "mujhe",
      "mera",
      "aap",
      "samajh",
      "samjh",
      "batao",
      "btao",
    ];
    if (hints.some((w) => lower.includes(w))) return "hinglish";
    return "en";
  } catch {
    return "en";
  }
}

function pickByLang(
  options: { en: string; hi: string; hinglish?: string },
  lang: Lang,
): string {
  if (lang === "hi") return options.hi;
  if (lang === "hinglish") return options.hinglish || options.hi;
  return options.en;
}

async function loadUserContext(userId: string) {
  try {
    const [{ data: goals }, { data: logs }] = await Promise.all([
      supabaseAdmin
        .from("goals")
        .select("title,category,target_frequency")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(5),
      supabaseAdmin
        .from("daily_logs")
        .select("goal_id,is_completed,log_date")
        .eq("user_id", userId)
        .gte(
          "log_date",
          new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10),
        )
        .order("log_date", { ascending: false })
        .limit(10),
    ]);
    return { goals: goals || [], logs: logs || [] };
  } catch {
    return { goals: [], logs: [] };
  }
}

function buildContextualInfo(goals: unknown[], logs: unknown[]): string {
  let contextualInfo = "";
  if (goals.length > 0) {
    const titles: string[] = [];
    for (const g of goals) {
      if (g && typeof g === "object" && "title" in g) {
        const t = (g as { title?: unknown }).title;
        if (typeof t === "string") titles.push(t);
      }
    }
    if (titles.length > 0) {
      contextualInfo += "\nUser's current goals: " + titles.join(", ");
    }
  }
  if (logs.length > 0) {
    let recentCompletions = 0;
    for (const l of logs) {
      if (l && typeof l === "object" && "is_completed" in l) {
        const c = (l as { is_completed?: unknown }).is_completed;
        if (typeof c === "boolean" && c) recentCompletions++;
      }
    }
    contextualInfo += `\nRecent activity: ${recentCompletions}/${logs.length} tasks completed in last 3 days`;
  }
  return contextualInfo;
}

function extractContent(body: unknown): string | null {
  if (body && typeof body === "object" && "content" in body) {
    const v = (body as { content?: unknown }).content;
    if (typeof v === "string") return v;
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await requireSession(req);
    const { id } = await params;
    const conversationId = Number(id);
    if (!conversationId || Number.isNaN(conversationId)) {
      return NextResponse.json(
        { error: "Invalid conversation id" },
        { status: 400 },
      );
    }

    // Ownership check
    const { data: conv, error: convErr } = await supabaseAdmin
      .from("chat_conversations")
      .select("id,user_id")
      .eq("id", conversationId)
      .single();
    if (convErr || !conv)
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    if (conv.user_id !== session.user_id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: messages, error } = await supabaseAdmin
      .from("chat_messages")
      .select("id,role,content,created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ messages: messages || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : null;
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await requireSession(req);
    const { id } = await params;
    const conversationId = Number(id);
    let body: unknown = null;
    try {
      body = await req.json();
    } catch {}
    const content = extractContent(body);

    if (!conversationId || Number.isNaN(conversationId)) {
      return NextResponse.json(
        { error: "Invalid conversation id" },
        { status: 400 },
      );
    }
    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 },
      );
    }

    let lang: Lang = detectLanguage(content);
    let tone: "empathetic" | "coaching" | "formal" | "casual" = "empathetic";
    try {
      const prefs = await getUserPreferences(session.user_id);
      const preferred = prefs.default_language as unknown as Lang | undefined;
      if (preferred === "en" || preferred === "hi" || preferred === "hinglish")
        lang = preferred;
      const t = prefs.tone as unknown as typeof tone | undefined;
      if (t) tone = t;
    } catch {}

    // Ownership check
    const { data: conv, error: convErr } = await supabaseAdmin
      .from("chat_conversations")
      .select("id,user_id,title,summary,updated_at")
      .eq("id", conversationId)
      .single();
    if (convErr || !conv)
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    if (conv.user_id !== session.user_id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Insert user message
    const { data: userMsg, error: userErr } = await supabaseAdmin
      .from("chat_messages")
      .insert([
        {
          conversation_id: conversationId,
          user_id: session.user_id,
          role: "user",
          content,
        },
      ])
      .select("id,role,content,created_at")
      .single();
    if (userErr || !userMsg)
      return NextResponse.json(
        { error: userErr.message || "Failed to save message" },
        { status: 400 },
      );

    // Auto-title if missing
    if (!conv.title) {
      const title = content.trim().slice(0, 80);
      await supabaseAdmin
        .from("chat_conversations")
        .update({ title })
        .eq("id", conversationId);
    }

    // Build AI response context
    const { goals, logs } = await loadUserContext(session.user_id);
    const contextualInfo = buildContextualInfo(goals, logs);
    const timestamp = new Date().toISOString();
    // Conversation long-term summary
    const longTerm = conv.summary
      ? `\nConversation summary so far: ${conv.summary.toString().slice(0, 1500)}`
      : "";
    // Other recent conversation summaries for this user
    let otherSummaries = "";
    try {
      const { data: others } = await supabaseAdmin
        .from("chat_conversations")
        .select("id,title,summary,updated_at")
        .eq("user_id", session.user_id)
        .neq("id", conversationId)
        .not("summary", "is", null)
        .order("updated_at", { ascending: false })
        .limit(5);
      if (Array.isArray(others) && others.length > 0) {
        const snippets: string[] = [];
        for (const c of others) {
          const title = (c as any).title || "";
          const s = ((c as any).summary || "").toString();
          if (s)
            snippets.push(`${title ? `${title}: ` : ""}${s.slice(0, 500)}`);
        }
        if (snippets.length)
          otherSummaries = `\nOther recent chats (memory):\n- ${snippets.join("\n- ")}`;
      }
    } catch {}
    // Load recent conversation history (exclude the message we just inserted)
    const { data: history, error: historyErr } = await supabaseAdmin
      .from("chat_messages")
      .select("role,content,created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);
    let transcript = "";
    if (!historyErr && Array.isArray(history) && history.length > 0) {
      const lines: string[] = [];
      // Exclude the trailing newly-added user message to avoid duplication
      const upto = Math.max(0, history.length - 1);
      for (let i = 0; i < upto; i++) {
        const m = history[i] as { role?: string; content?: string };
        const role = m.role === "assistant" ? "Assistant" : "User";
        const content = (m.content || "").toString().trim().slice(0, 1000);
        if (content) lines.push(`${role}: ${content}`);
      }
      if (lines.length > 0)
        transcript = `\nConversation so far:\n${lines.join("\n")}`;
    }

    const systemPrompt = `You are an intelligent, empathetic AI assistant for goals, habits, productivity, and personal growth.
Mirror the user's language (Hindi, Hinglish, or English). If user writes in Hindi/Hinglish, reply in that style using simple words. Be supportive and practical.
If the request is unclear, first ask one short clarifying question, then propose actionable steps. Prefer short sentences.`;
    const styleGuide = [
      "Mirror user language (Hindi/Hinglish/English).",
      "Use at most 5 hyphen bullets with concrete next steps.",
      "If user is confused about goals, ask 3-4 quick questions (interests, available time, current habits, priority area), then suggest 1-2 tiny actions for today.",
      "Avoid long intros; be specific and motivational.",
      `Tone: ${tone}. Default to ${lang.toUpperCase()} unless the user explicitly writes in another language; then mirror user language.`,
    ].join(" ");
    let assistantText: string | null = null;
    try {
      const raw = await aiRespond({
        userMessage: content,
        context: `Time: ${timestamp}${contextualInfo}${longTerm}${otherSummaries}${transcript}`,
        systemPrompt,
        styleGuide,
        maxTokens: 350,
        temperature: 0.7,
      });
      assistantText = raw?.trim() || null;
    } catch {
      assistantText = null;
    }

    if (!assistantText) {
      // Smart rule-based coach fallback
      const coach = ruleBasedCoach(content, lang);
      if (coach) {
        assistantText = coach;
      }
    }
    if (!assistantText) {
      const hasGoals = Array.isArray(goals) && goals.length > 0;
      let recentCompletions = 0;
      for (const l of logs) {
        if (l && typeof l === "object" && "is_completed" in l) {
          const c = (l as { is_completed?: unknown }).is_completed;
          if (typeof c === "boolean" && c) recentCompletions++;
        }
      }
      const totalRecent = logs.length;
      let fallback = pickByLang(
        {
          en: "I'm here to help. Could you share a bit more about what you need?",
          hi: "Main madad ke liye hoon. Thoda aur batayen—kis cheez me help chahiye?",
          hinglish:
            "Main help ke liye hoon. Thoda aur batao—kis cheez me help chahiye?",
        },
        lang,
      );
      if (hasGoals && totalRecent > 0) {
        const rate = totalRecent
          ? Math.round((recentCompletions / totalRecent) * 100)
          : 0;
        if (rate >= 70)
          fallback = pickByLang(
            {
              en: `Great momentum—${recentCompletions}/${totalRecent} tasks completed recently! Want to push to the next level?`,
              hi: `Bahut achchi momentum—recent me ${recentCompletions}/${totalRecent} tasks complete! Next level push karna chahenge?`,
              hinglish: `Great momentum—${recentCompletions}/${totalRecent} tasks complete! Next level push karein?`,
            },
            lang,
          );
        else if (rate >= 40)
          fallback = pickByLang(
            {
              en: `Solid progress—${recentCompletions}/${totalRecent} completed. What's one small improvement you can make today?`,
              hi: `Theek-thaak progress—${recentCompletions}/${totalRecent} complete. Aaj ek chhota improvement kya kar sakte hain?`,
              hinglish: `Solid progress—${recentCompletions}/${totalRecent} complete. Aaj ek chhota improvement kya kar sakte ho?`,
            },
            lang,
          );
        else
          fallback = pickByLang(
            {
              en: `It looks like consistency has been tough—${recentCompletions}/${totalRecent} completed. Want a simple plan to restart?`,
              hi: `Lagta hai consistency mushkil rahi—${recentCompletions}/${totalRecent} complete. Simple restart plan banayein?`,
              hinglish: `Consistency tough rahi—${recentCompletions}/${totalRecent} complete. Simple restart plan banayein?`,
            },
            lang,
          );
      } else if (hasGoals) {
        fallback = pickByLang(
          {
            en: "You have clear goals. Which one should we prioritize right now?",
            hi: "Aapke goals clear hain. Abhi kis ko priority deni chahiye?",
            hinglish: "Goals clear hain. Abhi kis goal ko priority dein?",
          },
          lang,
        );
      }
      assistantText = fallback;
    }

    // Save assistant message
    const { data: asstMsg, error: asstErr } = await supabaseAdmin
      .from("chat_messages")
      .insert([
        {
          conversation_id: conversationId,
          user_id: session.user_id,
          role: "assistant",
          content: assistantText,
        },
      ])
      .select("id,role,content,created_at")
      .single();
    if (asstErr || !asstMsg)
      return NextResponse.json(
        { error: asstErr.message || "Failed to save assistant message" },
        { status: 400 },
      );

    // Touch conversation updated_at
    await supabaseAdmin
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    // Update conversation long-term summary (uses last few turns + previous summary)
    try {
      const { data: recent } = await supabaseAdmin
        .from("chat_messages")
        .select("role,content,created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(12);
      const msgs: { role: "user" | "assistant" | "system"; content: string }[] =
        [];
      if (Array.isArray(recent)) {
        for (const m of recent) {
          const r = (m as any).role;
          const c = ((m as any).content || "").toString();
          if (r === "user" || r === "assistant" || r === "system") {
            msgs.push({ role: r, content: c });
          }
        }
      }
      const updated = await summarizeConversation({
        messages: msgs,
        previousSummary: (conv.summary as string) || null,
        targetLang: lang,
        tone,
      });
      if (updated) {
        await supabaseAdmin
          .from("chat_conversations")
          .update({
            summary: updated.slice(0, 8000),
            last_summary_at: new Date().toISOString(),
          })
          .eq("id", conversationId);
      }
    } catch {}

    return NextResponse.json({ response: assistantText, conversationId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : null;
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 },
    );
  }
}
