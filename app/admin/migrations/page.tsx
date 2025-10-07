"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";

interface MigrationFile {
  name: string;
  size: number;
  mtime: string | null;
}

export default function AdminMigrationsPage() {
  const [files, setFiles] = useState<MigrationFile[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [newMode, setNewMode] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return files;
    const q = query.toLowerCase();
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, query]);

  const dirty = useMemo(() => content !== original, [content, original]);

  const loadList = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/migrations/list", {
        cache: "no-store",
      });
      const d = await r.json();
      if (r.ok) setFiles(d.files || []);
    } catch {}
  }, []);

  const loadFile = useCallback(async (name: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const r = await fetch(
        `/api/admin/migrations/file?name=${encodeURIComponent(name)}`,
        { cache: "no-store" },
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Failed to load file");
      setSelected(name);
      setContent(d.content || "");
      setOriginal(d.content || "");
      setNewMode(false);
      setNewTitle("");
    } catch (err) {
      setMessage((err as Error).message || "Failed to load file");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  function insertTemplate(kind: "table" | "column" | "policy") {
    const templates: Record<string, string> = {
      table: [
        "-- Example: Create table",
        "BEGIN;",
        "CREATE TABLE IF NOT EXISTS public.example (",
        "  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),",
        "  name TEXT NOT NULL,",
        "  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
        ");",
        "COMMIT;",
        "",
      ].join("\n"),
      column: [
        "-- Example: Add column",
        "BEGIN;",
        "ALTER TABLE public.example ADD COLUMN IF NOT EXISTS description TEXT;",
        "COMMIT;",
        "",
      ].join("\n"),
      policy: [
        "-- Example: Enable RLS and create policy",
        "BEGIN;",
        "ALTER TABLE public.example ENABLE ROW LEVEL SECURITY;",
        'CREATE POLICY IF NOT EXISTS "Users can read own" ON public.example',
        "  FOR SELECT USING (auth.uid() = user_id);",
        "COMMIT;",
        "",
      ].join("\n"),
    };
    setContent(
      (prev) => (prev.endsWith("\n") ? prev : prev + "\n") + templates[kind],
    );
  }

  async function saveExisting() {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const r = await fetch("/api/admin/migrations/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selected, content }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Failed to save");
      setOriginal(content);
      setMessage("Saved successfully");
      await loadList();
    } catch (err) {
      setMessage((err as Error).message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function createNew() {
    if (!content.trim()) {
      setMessage("Content is required");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const r = await fetch("/api/admin/migrations/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle || "migration", content }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Failed to create");
      setSelected(d.name);
      setOriginal(content);
      setNewMode(false);
      setNewTitle("");
      await loadList();
      setMessage(`Created ${d.name}`);
    } catch (err) {
      setMessage((err as Error).message || "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  function startNew() {
    setSelected(null);
    setContent("");
    setOriginal("");
    setNewTitle("");
    setNewMode(true);
    setMessage(null);
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(content).then(() => {
      setMessage("Copied to clipboard");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Migrations
          </h1>
          <p className="text-slate-500">
            View, edit, and create SQL migration files. Copy and apply to
            Supabase as needed.
          </p>
        </div>
        <button
          onClick={startNew}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          New Migration
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* List */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-1">
          <div className="mb-3">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
              placeholder="Search by name"
              className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="max-h-[60vh] overflow-auto divide-y">
            {filtered.map((f) => (
              <button
                key={f.name}
                onClick={() => loadFile(f.name)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${selected === f.name ? "bg-slate-100" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium truncate">{f.name}</span>
                  <span className="text-xs text-slate-500">
                    {(f.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {f.mtime ? new Date(f.mtime).toLocaleString() : ""}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-3 text-sm text-slate-500">No files</div>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          {newMode ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="text-sm sm:col-span-2">
                  <span className="text-slate-600">Title</span>
                  <input
                    value={newTitle}
                    onChange={(e) => {
                      setNewTitle(e.target.value);
                    }}
                    placeholder="Short title e.g. add_user_profile_table"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 outline-none"
                  />
                </label>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => {
                      insertTemplate("table");
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Insert CREATE TABLE
                  </button>
                </div>
              </div>
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                }}
                placeholder="-- Write SQL here"
                className="mt-1 h-[50vh] w-full rounded-xl border border-slate-200 bg-transparent p-3 font-mono text-sm outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  disabled={saving}
                  onClick={createNew}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? "Creating..." : "Create"}
                </button>
                <button
                  onClick={copyToClipboard}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  Copy SQL
                </button>
                {message && (
                  <span className="text-sm text-slate-500">{message}</span>
                )}
              </div>
            </div>
          ) : selected ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Editing: <span className="font-semibold">{selected}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      insertTemplate("column");
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Insert ALTER TABLE
                  </button>
                  <button
                    onClick={() => {
                      insertTemplate("policy");
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Insert RLS Policy
                  </button>
                </div>
              </div>
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                }}
                className="mt-1 h-[50vh] w-full rounded-xl border border-slate-200 bg-transparent p-3 font-mono text-sm outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  disabled={!dirty || saving}
                  onClick={saveExisting}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? "Saving..." : dirty ? "Save Changes" : "Saved"}
                </button>
                <button
                  onClick={copyToClipboard}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  Copy SQL
                </button>
                {loading && (
                  <span className="text-sm text-slate-500">Loading...</span>
                )}
                {message && (
                  <span className="text-sm text-slate-500">{message}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">
              Select a file to edit, or create a new migration.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
