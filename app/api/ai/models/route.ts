import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { listAvailableModels } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const models = await listAvailableModels();
    return NextResponse.json({ models });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : undefined;
    return NextResponse.json({ models: [], error: msg || "Failed to list models" }, { status: 500 });
  }
}
