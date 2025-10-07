import { getGenerativeModel } from "./gemini";

export interface SummarizeMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function summarizeConversation({
  messages,
  previousSummary,
  targetLang = "en",
  tone = "empathetic",
  maxTokens = 300,
}: {
  messages: SummarizeMessage[];
  previousSummary?: string | null;
  targetLang?: "en" | "hi" | "hinglish";
  tone?: "empathetic" | "coaching" | "formal" | "casual";
  maxTokens?: number;
}): Promise<string | null> {
  try {
    const model = await getGenerativeModel("gemini-1.5-flash");
    const lastTurns = messages
      .map(
        (m) =>
          `${m.role === "assistant" ? "Assistant" : m.role === "user" ? "User" : "System"}: ${m.content}`,
      )
      .join("\n");

    const langNote =
      targetLang === "hi"
        ? "Write the summary in simple Hindi."
        : targetLang === "hinglish"
          ? "Write the summary in simple Hinglish."
          : "Write the summary in concise English.";

    const prompt = [
      `You are maintaining a compact long-term memory summary for an ongoing chat between a user and an AI coach.`,
      `Tone: ${tone}. ${langNote}`,
      `Keep it under ~200-250 words. Update the prior summary with new facts only. Prioritize:`,
      `- User goals, interests, constraints, preferences (language, tone, time availability)`,
      `- Ongoing tasks/commitments, progress, blockers`,
      `- Decisions made, follow-ups, next steps`,
      `Avoid verbatim logs; use high-signal bullets.`,
      previousSummary ? `Previous summary:\n${previousSummary}` : "",
      `Recent messages:\n${lastTurns}`,
      `Return only the updated summary text.`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const res = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
    });
    const text = res.response.text().trim();
    return text || null;
  } catch {
    return null;
  }
}
