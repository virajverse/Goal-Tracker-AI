import { supabaseAdmin } from "./supabase";

export type LangPref = "en" | "hi" | "hinglish";
export type TonePref = "empathetic" | "coaching" | "formal" | "casual";

export interface UserPreferences {
  user_id: string;
  default_language?: LangPref | null;
  tone: TonePref;
}

export async function getUserPreferences(
  user_id: string,
): Promise<Partial<UserPreferences>> {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_preferences")
      .select("user_id, default_language, tone")
      .eq("user_id", user_id)
      .single();
    if (error || !data) return {};
    return {
      user_id: data.user_id,
      default_language: data.default_language as LangPref | null | undefined,
      tone: (data.tone as TonePref) || "empathetic",
    };
  } catch {
    return {};
  }
}

export async function upsertUserPreferences(
  user_id: string,
  values: { default_language?: LangPref | null; tone?: TonePref },
): Promise<void> {
  const row: any = { user_id };
  if (typeof values.default_language !== "undefined")
    row.default_language = values.default_language;
  if (typeof values.tone !== "undefined") row.tone = values.tone;
  const { error } = await supabaseAdmin
    .from("user_preferences")
    .upsert([row], { onConflict: "user_id" })
    .select("user_id")
    .single();
  if (error) throw new Error(error.message);
}
