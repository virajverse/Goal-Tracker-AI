export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import path from "path";
import { readdir, stat } from "fs/promises";

export async function GET(req: Request) {
  try {
    await requireRole(req, ["admin"]);
    const dir = path.join(process.cwd(), "migrations");
    const entries = await readdir(dir, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".sql"))
      .map((e) => e.name)
      .sort();

    const detailed = await Promise.all(
      files.map(async (name) => {
        try {
          const s = await stat(path.join(dir, name));
          return { name, size: s.size, mtime: s.mtime.toISOString() };
        } catch {
          return { name, size: 0, mtime: null as any };
        }
      }),
    );

    return NextResponse.json({ files: detailed });
  } catch (err) {
    const status = (err as any)?.status === 403 ? 403 : 401;
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }
}
