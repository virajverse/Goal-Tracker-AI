export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAIConfig, maskSecret, setSettings } from "@/lib/config";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ["admin"]);
    const cfg = await getAIConfig();
    return NextResponse.json({
      provider: cfg.provider,
      openai: maskSecret(cfg.openai),
      gemini: maskSecret(cfg.gemini),
    });
  } catch (err) {
    const status = (err as any)?.status === 403 ? 403 : 401;
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await requireRole(req, ["admin"]);
    let body: unknown = null;
    try {
      body = await req.json();
    } catch {}

    const values: Record<string, string> = {};

    if (body && typeof body === "object") {
      const b = body as {
        provider?: unknown;
        openaiApiKey?: unknown;
        geminiApiKey?: unknown;
      };
      if (typeof b.provider === "string") {
        const p = b.provider.toLowerCase();
        if (p === "openai" || p === "gemini" || p === "auto") {
          values.AI_PROVIDER = p;
        } else {
          return NextResponse.json(
            { error: "Invalid provider" },
            { status: 400 },
          );
        }
      }
      if (typeof b.openaiApiKey === "string" && b.openaiApiKey.trim().length) {
        values.OPENAI_API_KEY = b.openaiApiKey.trim();
      }
      if (typeof b.geminiApiKey === "string" && b.geminiApiKey.trim().length) {
        values.GOOGLE_AI_API_KEY = b.geminiApiKey.trim();
      }
    }

    if (Object.keys(values).length === 0) {
      return NextResponse.json({ error: "No changes" }, { status: 400 });
    }

    await setSettings(values, user_id);
    const cfg = await getAIConfig();
    return NextResponse.json({
      ok: true,
      provider: cfg.provider,
      openai: maskSecret(cfg.openai),
      gemini: maskSecret(cfg.gemini),
    });
  } catch (err) {
    const status = (err as any)?.status === 403 ? 403 : 401;
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }
}
