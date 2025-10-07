export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ["admin"]);
    return NextResponse.json({
      visitors: 15500,
      signups: 132,
      conv_rate: 2.7,
      active_agents: 3,
    });
  } catch (err: any) {
    const status = err?.status === 403 ? 403 : 401;
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }
}
