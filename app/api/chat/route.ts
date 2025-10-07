export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { aiRespond } from "@/lib/ai";
import { ruleBasedCoach } from "@/lib/rule_coach";
import { getUserPreferences } from "@/lib/preferences";

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

function getGenericFallbacks(lang: Lang): string[] {
  return [
    pickByLang(
      {
        en: "I'm here to help. Could you share a bit more about what you need?",
        hi: "Main madad ke liye hoon. Zyada batayen, kis cheez me help chahiye?",
        hinglish:
          "Main help ke liye hoon. Thoda detail me batao, kis cheez me help chahiye?",
      },
      lang,
    ),
    pickByLang(
      {
        en: "Let's make progress on your goals. What would you like to focus on today?",
        hi: "Chaliye goals par progress banate hain. Aaj kis cheez par focus karna chahenge?",
        hinglish:
          "Chalo goals par progress banate hain. Aaj kis pe focus karna chahoge?",
      },
      lang,
    ),
    pickByLang(
      {
        en: "Tell me what you're working on, and I'll suggest clear next steps.",
        hi: "Aap kis par kaam kar rahe hain, batayen—main agle seedhe steps suggest karunga.",
        hinglish:
          "Aap kya kaam kar rahe ho batao—main clear next steps bata dunga.",
      },
      lang,
    ),
    pickByLang(
      {
        en: "What challenge are you facing right now? I can help you move forward.",
        hi: "Abhi sabse badi dikkat kya aa rahi hai? Main aage badhne me madad kar sakta hoon.",
        hinglish:
          "Abhi biggest challenge kya hai? Main aage badhne me help kar sakta hoon.",
      },
      lang,
    ),
  ];
}

// Helpers for safe parsing and aggregation
function extractMessage(body: unknown): string | null {
  if (body && typeof body === "object" && "message" in body) {
    const m = (body as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return null;
}

function countCompleted(items: unknown[]): number {
  let count = 0;
  for (const it of items) {
    if (it && typeof it === "object" && "is_completed" in it) {
      const done = (it as { is_completed?: unknown }).is_completed;
      if (done === true) count += 1;
    }
  }
  return count;
}

function safeTitles(items: unknown[]): string[] {
  const titles: string[] = [];
  for (const it of items) {
    if (it && typeof it === "object" && "title" in it) {
      const t = (it as { title?: unknown }).title;
      if (typeof t === "string") titles.push(t);
    }
  }
  return titles;
}

function getContextualFallback(
  userGoals: unknown[],
  recentActivity: unknown[],
  lang: Lang,
) {
  const hasGoals = Array.isArray(userGoals) && userGoals.length > 0;
  const totalRecent = Array.isArray(recentActivity) ? recentActivity.length : 0;
  const recentCompletions = Array.isArray(recentActivity)
    ? countCompleted(recentActivity)
    : 0;

  if (hasGoals && totalRecent > 0) {
    const rate = totalRecent
      ? Math.round((recentCompletions / totalRecent) * 100)
      : 0;
    if (rate >= 70) {
      return [
        pickByLang(
          {
            en: `Great momentum—${recentCompletions}/${totalRecent} tasks completed recently! Want to push to the next level?`,
            hi: `Bahut achchi momentum—recent me ${recentCompletions}/${totalRecent} tasks complete! Next level push karna chahenge?`,
            hinglish: `Great momentum—${recentCompletions}/${totalRecent} tasks complete! Next level push karein?`,
          },
          lang,
        ),
        pickByLang(
          {
            en: "You're doing excellent. Let's set one stretch goal for this week.",
            hi: "Aap bahut accha kar rahe hain. Is hafte ek stretch goal set karte hain.",
            hinglish:
              "Bahut accha chal raha hai. Is week ek stretch goal set karte hain.",
          },
          lang,
        ),
      ];
    } else if (rate >= 40) {
      return [
        pickByLang(
          {
            en: `Solid progress—${recentCompletions}/${totalRecent} completed. What's one small improvement you can make today?`,
            hi: `Theek-thaak progress—${recentCompletions}/${totalRecent} complete. Aaj ek chhota sa improvement kya kar sakte hain?`,
            hinglish: `Solid progress—${recentCompletions}/${totalRecent} complete. Aaj ek chhota improvement kya kar sakte ho?`,
          },
          lang,
        ),
        pickByLang(
          {
            en: "You're building consistency. Let's pick one manageable task to do now.",
            hi: "Aap consistency bana rahe hain. Abhi ek manageable task choose karte hain.",
            hinglish:
              "Consistency build ho rahi hai. Abhi ek manageable task choose karte hain.",
          },
          lang,
        ),
      ];
    } else {
      return [
        pickByLang(
          {
            en: `It looks like consistency has been tough—${recentCompletions}/${totalRecent} completed. Want a simple plan to restart?`,
            hi: `Lagta hai consistency mushkil rahi—${recentCompletions}/${totalRecent} complete. Simple restart plan banayein?`,
            hinglish: `Consistency tough rahi—${recentCompletions}/${totalRecent} complete. Simple restart plan banayein?`,
          },
          lang,
        ),
        pickByLang(
          {
            en: "No worries—progress isn't linear. Let's choose one tiny task to build momentum.",
            hi: "Tension mat lijiye—progress seedhi line me nahi hoti. Ek chhota task choose karke momentum banate hain.",
            hinglish:
              "No worries—progress linear nahi hoti. Ek chhota task choose karke momentum banate hain.",
          },
          lang,
        ),
      ];
    }
  }

  if (hasGoals) {
    return [
      pickByLang(
        {
          en: "You have clear goals. Which one should we prioritize right now?",
          hi: "Aapke goals clear hain. Abhi kis ko priority deni chahiye?",
          hinglish: "Goals clear hain. Abhi kis goal ko priority dein?",
        },
        lang,
      ),
      pickByLang(
        {
          en: "Let’s pick a small action for one of your goals today.",
          hi: "Aaj ke liye ek chhota action choose karte hain.",
          hinglish: "Aaj ke liye ek chhota action choose karte hain.",
        },
        lang,
      ),
    ];
  }

  return getGenericFallbacks(lang);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession(req);
    let body: unknown = null;
    try {
      body = await req.json();
    } catch {}
    const message = extractMessage(body);

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    let lang: Lang = detectLanguage(message);
    // Load user preferences and override defaults
    let tone: "empathetic" | "coaching" | "formal" | "casual" = "empathetic";
    try {
      const prefs = await getUserPreferences(session.user_id);
      const preferred = prefs.default_language as unknown as Lang | undefined;
      if (preferred === "en" || preferred === "hi" || preferred === "hinglish")
        lang = preferred;
      const t = prefs.tone as unknown as typeof tone | undefined;
      if (t) tone = t;
    } catch {}

    let userGoals: unknown[] = [];
    let recentActivity: unknown[] = [];

    try {
      const [{ data: goals }, { data: logs }] = await Promise.all([
        supabaseAdmin
          .from("goals")
          .select("title,category,target_frequency")
          .eq("user_id", session.user_id)
          .eq("is_active", true)
          .limit(5),
        supabaseAdmin
          .from("daily_logs")
          .select("goal_id,is_completed,log_date")
          .eq("user_id", session.user_id)
          .gte(
            "log_date",
            new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 10),
          )
          .order("log_date", { ascending: false })
          .limit(10),
      ]);
      userGoals = Array.isArray(goals) ? goals : [];
      recentActivity = Array.isArray(logs) ? logs : [];
    } catch {
      // Continue with empty arrays if database fails
    }

    // Try AI via unified helper (auto-resolves provider and enforces policy)
    let contextualInfo = "";
    if (userGoals.length > 0) {
      const titles = safeTitles(userGoals);
      if (titles.length > 0) {
        contextualInfo += "\nUser's current goals: " + titles.join(", ");
      }
    }
    if (recentActivity.length > 0) {
      const recentCompletions = countCompleted(recentActivity);
      contextualInfo += `\nRecent activity: ${recentCompletions}/${recentActivity.length} tasks completed in last 3 days`;
    }

    const timestamp = new Date().toISOString();
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

    try {
      const ai = await aiRespond({
        userMessage: message,
        context: `Time: ${timestamp}${contextualInfo}`,
        systemPrompt,
        styleGuide,
        maxTokens: 250,
        temperature: 0.7,
      });
      if (ai) return NextResponse.json({ response: ai });
    } catch {
      // continue to fallback
    }

    // Localized smart fallback (rule-based coach) with contextual prompts
    const rule = ruleBasedCoach(message, lang);
    const candidates = getContextualFallback(userGoals, recentActivity, lang);
    const response =
      rule ||
      candidates[Math.floor(Math.random() * candidates.length)] ||
      getGenericFallbacks(lang)[0];
    return NextResponse.json({ response });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to process chat message";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 },
    );
  }
}
