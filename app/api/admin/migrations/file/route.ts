export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import path from "path";
import { readFile } from "fs/promises";

function sanitizeName(name: string): string | null {
  if (!/^[0-9A-Za-z._-]+\.sql$/.test(name)) return null;
  return name;
}

export async function GET(req: Request) {
  try {
    await requireRole(req, ["admin"]);
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name") || "";
    const safe = sanitizeName(name);
    if (!safe)
      return NextResponse.json({ error: "Invalid file name" }, { status: 400 });

    const dir = path.join(process.cwd(), "migrations");
    const full = path.join(dir, safe);
    const content = await readFile(full, "utf8");
    return NextResponse.json({ name: safe, content });
  } catch (err: any) {
    if (err?.code === "ENOENT")
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const status = err?.status === 403 ? 403 : 401;
    if (status !== 401 && status !== 403) {
      return NextResponse.json(
        { error: "Failed to read file" },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }
}
