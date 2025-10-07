export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getGenerativeModel } from "@/lib/gemini";
import { getUserPreferences } from "@/lib/preferences";
import { summarizeConversation } from "@/lib/summarize";
import { ruleBasedCoach } from "@/lib/rule_coach";

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let conversationId = 0;
  let content = "";
  let regenerate = false;
  try {
    const session = await requireSession(req);
    const { id } = await params;
    conversationId = Number(id);
    if (!conversationId || Number.isNaN(conversationId)) {
      return new Response(
        sse(JSON.stringify({ error: "Invalid conversation id" })),
        {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
          status: 400,
        },
      );
    }

    let body: unknown = null;
    try {
      body = await req.json();
    } catch {}
    if (body && typeof body === "object") {
      const b = body as { content?: unknown; regenerate?: unknown };
      if (typeof b.content === "string") content = b.content;
      if (typeof b.regenerate === "boolean") regenerate = b.regenerate;
    }
    if (!content) {
      return new Response(
        sse(JSON.stringify({ error: "Content is required" })),
        {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
          status: 400,
        },
      );
    }

    // Ownership check
    const { data: conv, error: convErr } = await supabaseAdmin
      .from("chat_conversations")
      .select("id,user_id,title")
      .eq("id", conversationId)
      .single();
    if (convErr || !conv || conv.user_id !== session.user_id) {
      return new Response(
        sse(JSON.stringify({ error: convErr?.message || "Forbidden" })),
        {
          headers: { "Content-Type": "text/event-stream; charset=utf-8" },
          status: convErr ? 404 : 403,
        },
      );
    }

    // Insert user message unless this is a regeneration
    if (!regenerate) {
      await supabaseAdmin.from("chat_messages").insert([
        {
          conversation_id: conversationId,
          user_id: session.user_id,
          role: "user",
          content,
        },
      ]);
    }

    // Auto-title if missing
    if (!regenerate && !conv.title) {
      const title = content.trim().slice(0, 80);
      await supabaseAdmin
        .from("chat_conversations")
        .update({ title })
        .eq("id", conversationId);
    }

    // Build context
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
        if (titles.length > 0)
          contextualInfo += "\nUser's current goals: " + titles.join(", ");
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

    const { goals, logs } = await loadUserContext(conv.user_id);
    const contextualInfo = buildContextualInfo(goals, logs);
    const timestamp = new Date().toISOString();

    // Transcript (last 20 messages; if we inserted user msg, exclude it from transcript)
    const { data: history } = await supabaseAdmin
      .from("chat_messages")
      .select("role,content,created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);
    let transcript = "";
    if (Array.isArray(history) && history.length > 0) {
      const lines: string[] = [];
      const upto = !regenerate
        ? Math.max(0, history.length - 1)
        : history.length;
      for (let i = 0; i < upto; i++) {
        const m = history[i] as { role?: string; content?: string };
        const role = m.role === "assistant" ? "Assistant" : "User";
        const c = (m.content || "").toString().trim().slice(0, 1000);
        if (c) lines.push(`${role}: ${c}`);
      }
      if (lines.length > 0)
        transcript = `\nConversation so far:\n${lines.join("\n")}`;
    }
    // Conversation long-term summary and other chats memory
    const longTerm = (conv as any).summary
      ? `\nConversation summary so far: ${((conv as any).summary as string).toString().slice(0, 1500)}`
      : "";
    let otherSummaries = "";
    try {
      const { data: others } = await supabaseAdmin
        .from("chat_conversations")
        .select("id,title,summary,updated_at")
        .eq("user_id", conv.user_id)
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

    let lang: Lang = detectLanguage(content);
    let tone: "empathetic" | "coaching" | "formal" | "casual" = "empathetic";
    try {
      const prefs = await getUserPreferences(conv.user_id);
      const preferred = prefs.default_language as unknown as Lang | undefined;
      if (preferred === "en" || preferred === "hi" || preferred === "hinglish")
        lang = preferred;
      const t = prefs.tone as unknown as typeof tone | undefined;
      if (t) tone = t;
    } catch {}
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

    const model = await getGenerativeModel("gemini-1.5-flash");

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enc = new TextEncoder();
        let full = "";
        // Watchdog: if no tokens within 12s, emit a rule-based fallback and close
        let gotAny = false;
        const watchdogMs = 12000;
        const watchdog = setTimeout(async () => {
          if (!gotAny) {
            const fb = ruleBasedCoach(content, lang);
            try {
              if (fb) {
                full += fb;
                controller.enqueue(enc.encode(sse(fb)));
              }
              controller.enqueue(enc.encode("event: done\n\n"));
            } catch {}
            try { controller.close(); } catch {}
            // Save fallback assistant message and touch conversation as we normally do
            try {
              if (fb && conv) {
                await supabaseAdmin.from("chat_messages").insert([
                  {
                    conversation_id: conversationId,
                    user_id: conv.user_id,
                    role: "assistant",
                    content: fb,
                  },
                ]);
                await supabaseAdmin
                  .from("chat_conversations")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", conversationId);
              }
            } catch {}
          }
        }, watchdogMs);
        try {
          const res = await model.generateContentStream({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `${systemPrompt}\n\n${styleGuide}\n\nTime: ${timestamp}${contextualInfo}${longTerm}${otherSummaries}${transcript}\n\nMessage: ${content}`,
                  },
                ],
              },
            ],
          });
          for await (const chunk of res.stream) {
            const text = chunk.text();
            if (text) {
              gotAny = true;
              full += text;
              controller.enqueue(enc.encode(sse(text)));
            }
          }
          // Save assistant message and touch conversation
          try { clearTimeout(watchdog); } catch {}
          if (full.trim()) {
            await supabaseAdmin.from("chat_messages").insert([
              {
                conversation_id: conversationId,
                user_id: conv.user_id,
                role: "assistant",
                content: full.trim(),
              },
            ]);
            await supabaseAdmin
              .from("chat_conversations")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", conversationId);
            // Update long-term summary with recent turns
            try {
              const { data: recent } = await supabaseAdmin
                .from("chat_messages")
                .select("role,content,created_at")
                .eq("conversation_id", conversationId)
                .order("created_at", { ascending: true })
                .limit(12);
              const msgs: {
                role: "user" | "assistant" | "system";
                content: string;
              }[] = [];
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
                previousSummary: ((conv as any).summary as string) || null,
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
          }
          controller.enqueue(enc.encode("event: done\n\n"));
          controller.close();
        } catch (e) {
          try { clearTimeout(watchdog); } catch {}
          const coach = ruleBasedCoach(content, lang);
          const fb =
            coach ||
            (lang === "hi"
              ? "Main madad ke liye hoon. Thoda aur batayen—kis cheez me help chahiye?"
              : lang === "hinglish"
                ? "Main help ke liye hoon. Thoda aur batao—kis cheez me help chahiye?"
                : "I'm here to help. Could you share a bit more about what you need?");
          controller.enqueue(enc.encode(sse(fb)));
          // Save fallback as assistant message as well
          await supabaseAdmin.from("chat_messages").insert([
            {
              conversation_id: conversationId,
              user_id: conv.user_id,
              role: "assistant",
              content: fb,
            },
          ]);
          await supabaseAdmin
            .from("chat_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId);
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
