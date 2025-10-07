import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { aiRespond } from "@/lib/ai";
import { ruleBasedCoach } from "@/lib/rule_coach";

type Lang = "en" | "hi" | "hinglish";

function detectLanguage(text: string): Lang {
  try {
    if (/[^\u0000-\u007F]/.test(text) && /[\u0900-\u097F]/.test(text))
      return "hi"; // Devanagari
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

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    let raw: unknown = null;
    try {
      raw = await req.json();
    } catch {}
    let prompt: string | undefined;
    let model: string | undefined;
    let fallbacks: string[] | undefined;
    if (raw && typeof raw === "object") {
      const b = raw as { prompt?: unknown; model?: unknown; fallbacks?: unknown };
      if (typeof b.prompt === "string") prompt = b.prompt;
      if (typeof b.model === "string") model = b.model;
      if (Array.isArray(b.fallbacks)) fallbacks = b.fallbacks.filter((m) => typeof m === "string");
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }
    const lang: Lang = detectLanguage(prompt);
    const systemPrompt = `You are an empathetic assistant for goals, habits, productivity, and personal growth. Mirror the user's language (Hindi, Hinglish, or English). Keep it concise and practical.`;
    const styleGuide = [
      "Mirror user language (Hindi/Hinglish/English).",
      "Use up to 5 hyphen bullets for concrete steps.",
      "If unclear, ask 1 short clarifying question first.",
    ].join(" ");
    const response = await aiRespond({
      userMessage: prompt,
      maxTokens: 250,
      temperature: 0.7,
      systemPrompt,
      styleGuide,
      model,
      fallbacks,
    });

    // Hard cap output length to keep UI compact
    const limited =
      response && response.length > 1500
        ? response.slice(0, 1500) + "…"
        : response;

    const coach = ruleBasedCoach(prompt, lang);
    const fallback = pickByLang(
      {
        en: "I'm here to help. Could you share a bit more about what you need?",
        hi: "Main madad ke liye hoon. Thoda aur batayen—kis cheez me help chahiye?",
        hinglish:
          "Main help ke liye hoon. Thoda aur batao—kis cheez me help chahiye?",
      },
      lang,
    );
    return NextResponse.json({ response: limited || coach || fallback });
  } catch (err: unknown) {
    console.error("Error in AI API route:", err);
    const msg = err instanceof Error ? err.message : undefined;
    return NextResponse.json(
      { error: msg || "Failed to process AI request" },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
