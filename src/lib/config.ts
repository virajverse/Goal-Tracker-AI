import { supabaseAdmin } from "./supabase";

const TABLE = "admin_settings";

// simple in-memory cache with TTL
const cache: Record<string, { value: string; ts: number }> = {};
const TTL_MS = 60_000; // 1 minute

function now() {
  return Date.now();
}

export async function getSettings(
  keys: string[],
): Promise<Record<string, string | undefined>> {
  const out: Record<string, string | undefined> = {};
  const missing: string[] = [];

  for (const k of keys) {
    const c = cache[k];
    if (c && now() - c.ts < TTL_MS) {
      out[k] = c.value;
    } else {
      missing.push(k);
    }
  }

  if (missing.length) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("key,value")
      .in("key", missing);
    if (!error && data) {
      for (const row of data as { key: string; value: string }[]) {
        cache[row.key] = { value: row.value, ts: now() };
        out[row.key] = row.value;
      }
      // any truly missing stay undefined
    }
  }
  return out;
}

export async function setSettings(
  values: Record<string, string>,
  updated_by?: string,
): Promise<void> {
  const rows = Object.entries(values)
    .filter(([_, v]) => typeof v === "string")
    .map(([key, value]) => ({ key, value, updated_by }));
  if (!rows.length) return;
  const { error } = await supabaseAdmin
    .from(TABLE)
    .upsert(rows, { onConflict: "key" });
  if (error) throw new Error(error.message);
  for (const { key, value } of rows) {
    cache[key] = { value, ts: now() };
  }
}

export function maskSecret(v?: string | null): string {
  if (!v) return "";
  const tail = v.slice(-4);
  return v.length > 8 ? `••••••••${tail}` : "••••";
}

export async function getAIConfig() {
  const { AI_PROVIDER, OPENAI_API_KEY, GOOGLE_AI_API_KEY } = await getSettings([
    "AI_PROVIDER",
    "OPENAI_API_KEY",
    "GOOGLE_AI_API_KEY",
  ]);
  const provider = (
    AI_PROVIDER ||
    process.env.AI_PROVIDER ||
    "auto"
  ).toLowerCase();
  const openai =
    OPENAI_API_KEY || process.env.A4F_API_KEY || process.env.OPENAI_API_KEY;
  const gemini = GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  return { provider, openai, gemini } as {
    provider: string;
    openai?: string;
    gemini?: string;
  };
}
