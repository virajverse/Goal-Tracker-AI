"use client";
import React, { useEffect, useMemo, useState } from "react";

export default function SettingsPage() {
  // Role assign state
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<"user" | "agent" | "admin">("agent");
  const [msg, setMsg] = useState<string | null>(null);

  // AI settings state
  const [provider, setProvider] = useState<"auto" | "openai" | "gemini">(
    "auto",
  );
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [openaiMasked, setOpenaiMasked] = useState("");
  const [geminiMasked, setGeminiMasked] = useState("");
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [savingAI, setSavingAI] = useState(false);

  // SQL preview
  const sqlPreview = useMemo(() => {
    const lines: string[] = [];
    lines.push("-- Ensure admin_settings table exists");
    lines.push("CREATE TABLE IF NOT EXISTS public.admin_settings (");
    lines.push("  key TEXT PRIMARY KEY,");
    lines.push("  value TEXT NOT NULL,");
    lines.push("  updated_by UUID,");
    lines.push("  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
    lines.push(");");
    lines.push("ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;");
    const upserts: string[] = [];
    if (provider) {
      upserts.push(`('AI_PROVIDER','${provider}')`);
    }
    if (openaiApiKey.trim()) {
      upserts.push(
        `('OPENAI_API_KEY','${openaiApiKey.trim().replaceAll("'", "''")}')`,
      );
    }
    if (geminiApiKey.trim()) {
      upserts.push(
        `('GOOGLE_AI_API_KEY','${geminiApiKey.trim().replaceAll("'", "''")}')`,
      );
    }
    if (upserts.length) {
      lines.push("");
      lines.push("-- Apply changes");
      lines.push("INSERT INTO public.admin_settings (key, value) VALUES");
      lines.push(
        "  " +
          upserts.join(",\n  ") +
          "\nON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();",
      );
    }
    return lines.join("\n");
  }, [provider, openaiApiKey, geminiApiKey]);

  useEffect(() => {
    // Load current AI settings (masked) on mount
    (async () => {
      try {
        const r = await fetch("/api/admin/settings/ai", { cache: "no-store" });
        const d = await r.json();
        if (r.ok) {
          setProvider((d.provider as "auto" | "openai" | "gemini") || "auto");
          setOpenaiMasked(d.openai || "");
          setGeminiMasked(d.gemini || "");
        }
      } catch {}
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/admin/users/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data?.error || "Failed to update");
    } else {
      setMsg("Role updated");
      setUserId("");
    }
  }

  async function saveAI(e: React.FormEvent) {
    e.preventDefault();
    setAiMsg(null);
    setSavingAI(true);
    try {
      const payload: Record<string, string> = { provider };
      if (openaiApiKey.trim()) payload.openaiApiKey = openaiApiKey.trim();
      if (geminiApiKey.trim()) payload.geminiApiKey = geminiApiKey.trim();
      const res = await fetch("/api/admin/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save");
      setAiMsg("Saved. Backend will now use these keys.");
      // Refresh masked state
      setOpenaiMasked(data.openai || "");
      setGeminiMasked(data.gemini || "");
      // Clear input boxes (so we never echo secrets back)
      setOpenaiApiKey("");
      setGeminiApiKey("");
    } catch (err) {
      setAiMsg((err as Error).message || "Failed to save");
    } finally {
      setSavingAI(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="text-slate-500">
          Admin configuration and access control.
        </p>
      </div>

      {/* AI Provider & Keys */}
      <form
        onSubmit={saveAI}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm"
      >
        <p className="text-sm font-medium">AI Provider & API Keys</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-slate-600">Provider</span>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value as any);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 outline-none"
            >
              <option value="auto">Auto</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
            </select>
          </label>
          <div className="text-xs text-slate-500 self-end">
            Current: {provider}
          </div>
          <label className="text-sm sm:col-span-2">
            <span className="text-slate-600">OpenAI API Key</span>
            <input
              value={openaiApiKey}
              onChange={(e) => {
                setOpenaiApiKey(e.target.value);
              }}
              placeholder={openaiMasked ? `Current: ${openaiMasked}` : "sk-..."}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 outline-none"
            />
            <span className="mt-1 block text-xs text-slate-500">
              We never display full saved secrets. Enter only when updating.
            </span>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-slate-600">Gemini API Key</span>
            <input
              value={geminiApiKey}
              onChange={(e) => {
                setGeminiApiKey(e.target.value);
              }}
              placeholder={
                geminiMasked ? `Current: ${geminiMasked}` : "AIza..."
              }
              className="mt-1 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 outline-none"
            />
            <span className="mt-1 block text-xs text-slate-500">
              We never display full saved secrets. Enter only when updating.
            </span>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={savingAI}
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {savingAI ? "Saving..." : "Save"}
          </button>
          {aiMsg && <span className="text-sm text-slate-500">{aiMsg}</span>}
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-600">
            SQL to run in Supabase (optional)
          </p>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-slate-800 border border-slate-200">
            <code>{sqlPreview}</code>
          </pre>
          <p className="mt-2 text-xs text-slate-500">
            Copy and paste into Supabase SQL editor to create/update settings.
            This includes plaintext keys; handle securely.
          </p>
        </div>
      </form>

      {/* Assign Role */}
      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm max-w-xl"
      >
        <p className="text-sm font-medium">Assign Role</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-slate-600">User ID</span>
            <input
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
              }}
              placeholder="uuid"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 outline-none"
            />
          </label>
          <label className="text-sm">
            <span className="text-slate-600">Role</span>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value as any);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 outline-none"
            >
              <option value="user">User</option>
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Save
          </button>
          {msg && <span className="text-sm text-slate-500">{msg}</span>}
        </div>
      </form>
    </div>
  );
}
