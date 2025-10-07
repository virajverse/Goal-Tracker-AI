export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";

const mock = [
  {
    id: "1023",
    subject: "Issue logging in",
    status: "open",
    customer: "jane@example.com",
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    assigned_to: "alex",
  },
  {
    id: "1022",
    subject: "Payment not captured",
    status: "open",
    customer: "mike@example.com",
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    assigned_to: null,
  },
  {
    id: "1021",
    subject: "Feature request",
    status: "closed",
    customer: "sara@example.com",
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    assigned_to: "sam",
  },
];

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ["admin", "agent"]);
    return NextResponse.json({ tickets: mock });
  } catch (err: any) {
    const status = err?.status === 403 ? 403 : 401;
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }
}
