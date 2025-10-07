import type { NextRequest } from "next/server";
import { getGenerativeModel } from "@/lib/gemini";
import { ruleBasedCoach } from "@/lib/rule_coach";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Lang = "en" | "hi" | "hinglish";

function detectLanguage(text: string): Lang {
  try {
    if (/[^\u0000-\u007F]/.test(text) && /[\u0900-\u097F]/.test(text))
      return "hi";
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

function sse(data: string) {
  return `data: ${data}\n\n`;
}

export async function POST(req: NextRequest) {
  try {
    let raw: unknown = null;
    try {
      raw = await req.json();
    } catch {}
    let prompt: string | undefined;
    if (raw && typeof raw === "object") {
      const b = raw as { prompt?: unknown };
      if (typeof b.prompt === "string") prompt = b.prompt;
    }
    if (!prompt) {
      return new Response(
        sse(JSON.stringify({ error: "Prompt is required" })),
        {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        },
      );
    }

    const lang: Lang = detectLanguage(prompt);
    const systemPrompt = `You are an empathetic assistant for goals, habits, productivity, and personal growth. Mirror the user's language (Hindi, Hinglish, or English). Keep it concise and practical.`;
    const styleGuide = [
      "Mirror user language (Hindi/Hinglish/English).",
      "Use up to 5 hyphen bullets for concrete steps.",
      "If unclear, ask 1 short clarifying question first.",
    ].join(" ");

    const model = await getGenerativeModel("gemini-1.5-flash");

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enc = new TextEncoder();
        // Watchdog: if no tokens within 12s, emit a smart fallback and close
        let gotAny = false;
        const watchdogMs = 12000;
        const watchdog = setTimeout(() => {
          if (!gotAny) {
            const fb = ruleBasedCoach(prompt!, lang);
            try {
              controller.enqueue(enc.encode(sse(fb)));
              controller.enqueue(enc.encode("event: done\n\n"));
            } catch {}
            try { controller.close(); } catch {}
          }
        }, watchdogMs);
        try {
          const res = await model.generateContentStream({
            contents: [
              {
                role: "user",
                parts: [
                  { text: `${systemPrompt}\n\n${styleGuide}\n\n${prompt}` },
                ],
              },
            ],
          });
          for await (const chunk of res.stream) {
            const text = chunk.text();
            if (text) {
              gotAny = true;
              controller.enqueue(enc.encode(sse(text)));
            }
          }
          try { clearTimeout(watchdog); } catch {}
          controller.enqueue(enc.encode("event: done\n\n"));
          controller.close();
        } catch (e) {
          try { clearTimeout(watchdog); } catch {}
          const coach = ruleBasedCoach(prompt, lang);
          controller.enqueue(enc.encode(sse(coach)));
          controller.enqueue(enc.encode("event: done\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    return new Response(
      sse(JSON.stringify({ error: "Failed to start stream" })),
      {
        headers: { "Content-Type": "text/event-stream; charset=utf-8" },
        status: 500,
      },
    );
  }
}
