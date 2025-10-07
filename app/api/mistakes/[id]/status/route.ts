export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";

// POST body: { status: 'open' | 'repeated' | 'solved', increment?: boolean, occurred_at?: string }
type MistakeStatus = "open" | "repeated" | "solved";

function extractBody(body: unknown): {
  status: MistakeStatus | null;
  increment: boolean;
  occurred_at?: string;
} {
  let status: MistakeStatus | null = null;
  let increment = false;
  let occurred_at: string | undefined;
  if (body && typeof body === "object") {
    const b = body as {
      status?: unknown;
      increment?: unknown;
      occurred_at?: unknown;
    };
    if (b.status === "open" || b.status === "repeated" || b.status === "solved")
      status = b.status;
    if (typeof b.increment === "boolean") increment = b.increment;
    if (typeof b.occurred_at === "string") occurred_at = b.occurred_at;
  }
  return { status, increment, occurred_at };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await requireSession(req);
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isFinite(id))
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    let raw: unknown = null;
    try {
      raw = await req.json();
    } catch {}
    const { status, increment, occurred_at } = extractBody(raw);
    if (!status) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Fetch existing to compute increment server-side safely
    const { data: existing, error: getErr } = await supabaseAdmin
      .from("mistakes")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user_id)
      .single();
    if (getErr || !existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const payload: {
      status: MistakeStatus;
      occurrence_count?: number;
      last_occurred_at?: string;
    } = { status };
    if (increment) {
      const occ = (existing as Record<string, unknown>).occurrence_count;
      const current: number = typeof occ === "number" ? occ : 0;
      payload.occurrence_count = current + 1;
      payload.last_occurred_at =
        occurred_at ?? new Date().toISOString().slice(0, 10);
    }

    const { data, error } = await supabaseAdmin
      .from("mistakes")
      .update(payload)
      .eq("id", id)
      .eq("user_id", session.user_id)
      .select("*")
      .single();

    if (error || !data)
      return NextResponse.json(
        { error: error?.message || "Failed to update status" },
        { status: 400 },
      );
    return NextResponse.json({ mistake: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : null;
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 },
    );
  }
}
