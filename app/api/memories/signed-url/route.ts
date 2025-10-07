export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");
    const expires = Number(searchParams.get("expires")) || 3600; // seconds

    if (!path)
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    // Basic ownership check: path must start with `${user_id}/`
    if (!path.startsWith(`${session.user_id}/`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin.storage
      .from("memories")
      .createSignedUrl(path, expires);

    if (error || !data.signedUrl) {
      return NextResponse.json(
        { error: error?.message || "Failed to create signed URL" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      signed_url: data.signedUrl,
      expires_in: expires,
    });
  } catch (err: any) {
    if (err?.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to create signed URL" },
      { status: 500 },
    );
  }
}
