import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAIConfig } from "./config";

let cachedGenAI: GoogleGenerativeAI | null = null;
let lastKey: string | null = null;

async function getGenAI() {
  const { gemini } = await getAIConfig();
  const apiKey = gemini || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is not configured");
  }
  if (!cachedGenAI || lastKey !== apiKey) {
    cachedGenAI = new GoogleGenerativeAI(apiKey);
    lastKey = apiKey;
  }
  return cachedGenAI;
}

// Default to a model that is available on older v1beta endpoints as well.
// You can override with env GEMINI_MODEL to pin a specific model.
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash-001";
const ENV_FALLBACKS = (process.env.GEMINI_MODEL_FALLBACKS || "")
  .split(",")
  .map((s) => s.trim())
  .filter((s) => !!s);
const DEFAULT_FALLBACKS: string[] = Array.from(
  new Set([
    DEFAULT_GEMINI_MODEL,
    ...ENV_FALLBACKS,
    "gemini-1.5-pro-001",
    "gemini-1.0-pro",
  ]),
);

function normalizeModelName(name: string): string {
  let n = name.trim();
  if (n.startsWith("models/")) n = n.slice("models/".length);
  if (n === "gemini-1.5-flash") return "gemini-1.5-flash-001";
  if (n === "gemini-1.5-pro") return "gemini-1.5-pro-001";
  return n;
}

export async function listAvailableModels(): Promise<string[]> {
  // Uses REST ListModels; filters to those supporting generateContent
  const { gemini } = await getAIConfig();
  const apiKey = gemini || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return [];
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
    const r = await fetch(url, { method: "GET" });
    if (!r.ok) return [];
    const data = (await r.json()) as {
      models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
    };
    const names = (data.models || [])
      .filter((m) =>
        Array.isArray(m.supportedGenerationMethods)
          ? m.supportedGenerationMethods.includes("generateContent")
          : true,
      )
      .map((m) => m.name)
      .filter((n): n is string => typeof n === "string" && !!n)
      .map((n) => normalizeModelName(n));
    return names;
  } catch {
    return [];
  }
}

export async function getGenerativeModel(model: string = DEFAULT_GEMINI_MODEL) {
  const genAI = await getGenAI();
  return genAI.getGenerativeModel({ model });
}
interface GenerateTextOptions {
  prompt: string;
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  model?: string; // preferred model (e.g., from request or env)
  fallbacks?: string[]; // additional fallbacks to try in order
}

export async function generateText({
  prompt,
  maxOutputTokens = 100,
  temperature = 0.7,
  timeoutMs = 15000,
  model,
  fallbacks,
}: GenerateTextOptions): Promise<string> {
  try {
    // Build prioritized model list
    const priority: string[] = [];
    if (model && typeof model === "string" && model.trim())
      priority.push(normalizeModelName(model));
    if (Array.isArray(fallbacks))
      priority.push(...fallbacks.map((m) => normalizeModelName(m)));
    priority.push(...DEFAULT_FALLBACKS.map((m) => normalizeModelName(m)));
    const prioritized = Array.from(new Set(priority));

    // Optionally filter to available models (best-effort)
    let candidates = prioritized;
    const available = await listAvailableModels();
    if (available.length) {
      candidates = prioritized.filter((m) => available.includes(m));
      // If the preferred model was not in available (API sometimes lags), keep it at front anyway
      if (model) {
        const nm = normalizeModelName(model);
        if (!candidates.includes(nm)) candidates = [nm, ...candidates];
      }
    }
    if (!candidates.length) candidates = prioritized; // fallback to all if list failed

    let lastErr: unknown = null;
    for (const m of candidates) {
      try {
        const g = await getGenerativeModel(normalizeModelName(m));
        const genPromise = g
          .generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens,
              temperature,
            },
          })
          .then((result) => result.response)
          .then((response) => response.text());

        const timeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(
            () => {
              reject(new Error("Gemini request timed out"));
            },
            Math.max(1000, timeoutMs),
          ),
        );
        return await Promise.race([genPromise, timeoutPromise]);
      } catch (e) {
        lastErr = e;
        // try next model
      }
    }
    throw lastErr ?? new Error("Gemini generation failed");
  } catch (error) {
    console.error("Error generating text with Gemini:", error);
    throw new Error("Failed to generate text with Gemini");
  }
}
// Example usage:
// const response = await generateText({ prompt: 'Tell me a joke' });
