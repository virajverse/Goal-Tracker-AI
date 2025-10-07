export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import type { LangPref, TonePref } from "@/lib/preferences";
import { getUserPreferences, upsertUserPreferences } from "@/lib/preferences";

function isLang(v: unknown): v is LangPref | null | undefined {
  return (
    v === "en" ||
    v === "hi" ||
    v === "hinglish" ||
    v === null ||
    typeof v === "undefined"
  );
}
function isTone(v: unknown): v is TonePref | undefined {
  return (
    v === "empathetic" ||
    v === "coaching" ||
    v === "formal" ||
    v === "casual" ||
    typeof v === "undefined"
  );
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession(req);
    const prefs = await getUserPreferences(session.user_id);
    return NextResponse.json({ preferences: prefs || {} });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : undefined;
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to load preferences" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession(req);
    let body: unknown = null;
    try {
      body = await req.json();
    } catch {}
    let default_language: unknown;
    let tone: unknown;
    if (body && typeof body === "object") {
      const b = body as { default_language?: unknown; tone?: unknown };
      default_language = b.default_language;
      tone = b.tone;
    }
    if (!isLang(default_language) || !isTone(tone)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    await upsertUserPreferences(session.user_id, {
      default_language:
        typeof default_language === "string" ? default_language : null,
      tone: typeof tone === "string" ? tone : undefined,
    });
    const prefs = await getUserPreferences(session.user_id);
    return NextResponse.json({ preferences: prefs || {} });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : undefined;
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 },
    );
  }
}
