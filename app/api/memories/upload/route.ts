export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file)
      return NextResponse.json(
        { error: 'file is required (multipart/form-data key "file")' },
        { status: 400 },
      );

    const timestamp = Date.now();
    const safeName = (file as any).name
      ? (file as any).name.replace(/[^a-zA-Z0-9._-]/g, "_")
      : `upload_${timestamp}`;
    const path = `${session.user_id}/${timestamp}_${safeName}`;

    const arrayBuffer = await file.arrayBuffer();

    const { data, error } = await supabaseAdmin.storage
      .from("memories")
      .upload(path, arrayBuffer, { contentType: file.type });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ image_path: path, key: data.path ?? path });
  } catch (err: any) {
    if (err?.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 },
    );
  }
}
