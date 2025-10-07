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
    const q = (searchParams.get("q") || "").trim();

    let query = supabaseAdmin
      .from("chat_conversations")
      .select("id,title,created_at,updated_at,pinned")
      .eq("user_id", session.user_id)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });

    if (q) {
      query = query.ilike("title", `%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      // Fallback if 'pinned' column doesn't exist yet (migration not applied)
      if (typeof error.message === "string" && error.message.toLowerCase().includes("pinned")) {
        const { data: data2, error: error2 } = await supabaseAdmin
          .from("chat_conversations")
          .select("id,title,created_at,updated_at")
          .eq("user_id", session.user_id)
          .order("updated_at", { ascending: false });
        if (error2)
          return NextResponse.json({ error: error2.message }, { status: 400 });
        return NextResponse.json({ conversations: data2 || [] });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ conversations: data || [] });
  } catch (err: any) {
    if (err?.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const body = await req.json();
    const rawTitle = (body?.title as string | undefined) || "";
    const title = rawTitle.trim().slice(0, 120) || "New chat";

    const { data, error } = await supabaseAdmin
      .from("chat_conversations")
      .insert([{ user_id: session.user_id, title }])
      .select("id,title,created_at,updated_at,pinned")
      .single();

    if (error || !data) {
      // Fallback if 'pinned' column doesn't exist yet (migration not applied)
      if (error && typeof error.message === "string" && error.message.toLowerCase().includes("pinned")) {
        // Re-select without pinned
        const { data: data2, error: error2 } = await supabaseAdmin
          .from("chat_conversations")
          .select("id,title,created_at,updated_at")
          .eq("user_id", session.user_id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .single();
        if (error2 || !data2)
          return NextResponse.json(
            { error: (error2 && error2.message) || "Failed to create conversation" },
            { status: 400 },
          );
        return NextResponse.json({ conversation: data2 });
      }
      return NextResponse.json(
        { error: (error && error.message) || "Failed to create conversation" },
        { status: 400 },
      );
    }
    return NextResponse.json({ conversation: data });
  } catch (err: any) {
    if (err?.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 },
    );
  }
}
