export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const { name, profile_image } = await req.json();

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      session.user_id,
      {
        user_metadata: {
          ...(name !== undefined ? { name } : {}),
          ...(profile_image !== undefined ? { profile_image } : {}),
        },
      },
    );

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || "Failed to update profile" },
        { status: 400 },
      );
    }

    const user = data.user;
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata.name ?? "",
        profile_image: user.user_metadata.profile_image ?? "",
        is_email_verified: !!user.email_confirmed_at,
        is_phone_verified: false,
      },
    });
  } catch (err: any) {
    if (err?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: err?.message || "Profile update failed" },
      { status: 500 },
    );
  }
}
