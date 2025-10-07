export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import path from "path";
import { mkdir, readdir, stat, writeFile } from "fs/promises";

function sanitizeExistingName(name: string): string | null {
  if (!/^[0-9A-Za-z._-]+\.sql$/.test(name)) return null;
  return name;
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "migration"
  );
}

async function nextSequence(dir: string): Promise<string> {
  const entries = await readdir(dir).catch(() => [] as string[]);
  let max = 0;
  for (const name of entries) {
    const m = /^(\d{4})_/.exec(name);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  const next = (max + 1).toString().padStart(4, "0");
  return next;
}

export async function POST(req: Request) {
  try {
    await requireRole(req, ["admin"]);
    let body: unknown = null;
    try {
      body = await req.json();
    } catch {}
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const b = body as { name?: unknown; title?: unknown; content?: unknown };
    const content = typeof b.content === "string" ? b.content : "";
    if (!content.trim())
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 },
      );

    const dir = path.join(process.cwd(), "migrations");
    await mkdir(dir, { recursive: true });

    if (typeof b.name === "string" && b.name) {
      const safe = sanitizeExistingName(b.name);
      if (!safe)
        return NextResponse.json(
          { error: "Invalid file name" },
          { status: 400 },
        );
      const full = path.join(dir, safe);
      await writeFile(full, content, "utf8");
      const s = await stat(full).catch(() => null as any);
      return NextResponse.json({
        ok: true,
        name: safe,
        size: s?.size ?? content.length,
      });
    }

    // Create new file
    const title =
      typeof b.title === "string" && b.title.trim()
        ? b.title.trim()
        : "migration";
    const seq = await nextSequence(dir);
    const slug = slugify(title);
    const name = `${seq}_${slug}.sql`;
    const full = path.join(dir, name);
    await writeFile(full, content, "utf8");
    const s = await stat(full).catch(() => null as any);
    return NextResponse.json({
      ok: true,
      name,
      size: s?.size ?? content.length,
    });
  } catch (err) {
    const status = (err as any)?.status === 403 ? 403 : 401;
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }
}
