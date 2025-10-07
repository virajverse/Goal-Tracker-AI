"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/react-app/hooks/useCustomAuth";

interface Memory {
  id: number;
  user_id: string;
  title: string | null;
  content: string;
  mood_tag: "happy" | "sad" | "success" | "failure" | null;
  memory_date: string | null; // YYYY-MM-DD
  image_path: string | null;
  created_at: string;
}

type MoodTag = "happy" | "sad" | "success" | "failure";

interface CreateMemoryPayload {
  content: string;
  title?: string;
  mood_tag?: MoodTag;
  memory_date?: string;
  image_path?: string;
}

export default function Memories(): React.ReactElement {
  const { user, isLoading } = useAuth();
  const [items, setItems] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{
    mood?: string;
    start?: string;
    end?: string;
  }>({});

  // calendar state
  const [month, setMonth] = useState<string>(() => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    return `${String(y)}-${m}`;
  });
  const [cal, setCal] = useState<{
    start: string;
    end: string;
    counts: Record<string, number>;
  } | null>(null);
  const [calLoading, setCalLoading] = useState(false);

  // form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<"" | MoodTag>("");
  const [date, setDate] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const canFetch = useMemo(() => !isLoading && !!user, [isLoading, user]);

  useEffect(() => {
    if (!canFetch) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetch, filters.mood, filters.start, filters.end]);

  useEffect(() => {
    if (!canFetch) return;
    void loadCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetch, month]);

  async function load(): Promise<void> {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (filters.mood) qs.set("mood", filters.mood);
      if (filters.start) qs.set("start", filters.start);
      if (filters.end) qs.set("end", filters.end);
      const res = await fetch(
        `/api/memories${qs.toString() ? `?${qs.toString()}` : ""}`,
      );
      if (!res.ok) throw new Error("Failed");
      const data: unknown = await res.json();
      const items =
        data && typeof data === "object" && "memories" in data &&
        Array.isArray((data as { memories?: unknown }).memories)
          ? ((data as { memories: Memory[] }).memories)
          : [];
      setItems(items);
    } catch {
      // suppress for guests
    } finally {
      setLoading(false);
    }
  }

  async function loadCalendar(): Promise<void> {
    try {
      setCalLoading(true);
      const qs = new URLSearchParams({ month });
      const res = await fetch(`/api/memories/calendar?${qs.toString()}`);
      const data: unknown = await res.json();
      if (res.ok) {
        const val =
          data && typeof data === "object" &&
          "start" in data && "end" in data && "counts" in data
            ? (data as { start: string; end: string; counts: Record<string, number> })
            : null;
        setCal(val);
      }
    } catch {
      // suppress for guests
    } finally {
      setCalLoading(false);
    }
  }

  function changeMonth(delta: number): void {
    const [yStr, mStr] = month.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    const newMonth = `${String(d.getUTCFullYear())}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    setMonth(newMonth);
  }

  function formatMonthLabel(m: string): string {
    const [yStr, moStr] = m.split("-");
    const d = new Date(Date.UTC(Number(yStr), Number(moStr) - 1, 1));
    return d.toLocaleString(undefined, { month: "long", year: "numeric" });
  }

  async function createMemory(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to add a memory");
      return;
    }
    try {
      setLoading(true);
      let image_path: string | undefined;
      if (file) {
        setUploadError(null);
        setUploadProgress(0);
        const fd = new FormData();
        fd.append("file", file);
        image_path = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/memories/upload", true);
          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) {
              const pct = Math.round((ev.loaded / ev.total) * 100);
              setUploadProgress(pct);
            }
          };
          xhr.onload = () => {
            try {
              const text = typeof xhr.responseText === "string" && xhr.responseText.trim().length > 0
                ? xhr.responseText
                : "{}";
              const uj = JSON.parse(text) as {
                image_path?: string;
                error?: string;
              };
              if (xhr.status >= 200 && xhr.status < 300 && uj.image_path) {
                resolve(uj.image_path);
              } else {
                reject(new Error(uj.error ?? "Upload failed"));
              }
            } catch {
              reject(new Error("Upload failed"));
            }
          };
          xhr.onerror = () => {
            reject(new Error("Network error during upload"));
          };
          xhr.send(fd);
        });
      }
      const payload: CreateMemoryPayload = { content };
      if (title) payload.title = title;
      if (mood) payload.mood_tag = mood;
      if (date) payload.memory_date = date;
      if (image_path) payload.image_path = image_path;

      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: unknown = await res.json();
      let errMsg: string | undefined;
      if (data && typeof data === "object" && "error" in data) {
        const e = (data as { error?: unknown }).error;
        if (typeof e === "string") errMsg = e;
      }
      if (!res.ok) throw new Error(errMsg ?? "Create failed");
      toast.success("Memory added");
      setTitle("");
      setContent("");
      setMood("");
      setDate("");
      setFile(null);
      setUploadProgress(null);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create";
      if (e instanceof Error) setUploadError(e.message);
      toast.error(msg);
    } finally {
      setLoading(false);
      // If creation failed after upload, ensure progress resets eventually
      setTimeout(() => {
        setUploadProgress(null);
      }, 300);
    }
  }

  async function removeMemory(id: number): Promise<void> {
    if (!user) {
      toast.error("Please login");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/memories/${String(id)}`, { method: "DELETE" });
      const data: unknown = await res.json();
      let errMsg: string | undefined;
      if (data && typeof data === "object" && "error" in data) {
        const e = (data as { error?: unknown }).error;
        if (typeof e === "string") errMsg = e;
      }
      if (!res.ok) throw new Error(errMsg ?? "Delete failed");
      toast.success("Deleted");
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-white">Memories</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm text-purple-200 mb-1">Mood</label>
          <select
            className="bg-white/10 text-white px-3 py-2 rounded-lg"
            value={filters.mood ?? ""}
            onChange={(e) => {
              setFilters((f) => ({ ...f, mood: e.target.value || undefined }));
            }}
          >
            <option value="">All</option>
            <option value="happy">Happy</option>
            <option value="sad">Sad</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-purple-200 mb-1">Start</label>
          <input
            type="date"
            className="bg-white/10 text-white px-3 py-2 rounded-lg"
            value={filters.start ?? ""}
            onChange={(e) => {
              setFilters((f) => ({ ...f, start: e.target.value || undefined }));
            }}
          />
        </div>
        <div>
          <label className="block text-sm text-purple-200 mb-1">End</label>
          <input
            type="date"
            className="bg-white/10 text-white px-3 py-2 rounded-lg"
            value={filters.end ?? ""}
            onChange={(e) => {
              setFilters((f) => ({ ...f, end: e.target.value || undefined }));
            }}
          />
        </div>
        <div>
          <label className="block text-sm text-transparent mb-1">Clear</label>
          <button
            type="button"
            className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
            onClick={() => {
              setFilters((f) => ({ ...f, start: undefined, end: undefined }));
            }}
          >
            Clear dates
          </button>
        </div>
      </div>

      {/* Calendar */}
      {user && (
        <div className="bg-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                changeMonth(-1);
              }}
              className="px-3 py-1 rounded bg-white/10 text-white hover:bg-white/20"
            >
              ← Prev
            </button>
            <div className="text-white font-medium">
              {formatMonthLabel(month)}
            </div>
            <button
              type="button"
              onClick={() => {
                changeMonth(1);
              }}
              className="px-3 py-1 rounded bg-white/10 text-white hover:bg-white/20"
            >
              Next →
            </button>
          </div>
          <CalendarGrid
            month={month}
            counts={cal?.counts ?? {}}
            loading={calLoading}
            onSelectDate={(d: string) => {
              setFilters((f) => ({ ...f, start: d, end: d }));
            }}
          />
        </div>
      )}

      {/* Create form */}
      <form
        onSubmit={(e) => {
          void createMemory(e);
        }}
        className="bg-white/10 rounded-xl p-4 space-y-3"
      >
        <div className="grid md:grid-cols-2 gap-3">
          <input
            placeholder="Title (optional)"
            className="bg-white/10 text-white px-3 py-2 rounded-lg"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
          />
          <select
            className="bg-white/10 text-white px-3 py-2 rounded-lg"
            value={mood}
            onChange={(e) => {
              setMood(e.target.value as "" | MoodTag);
            }}
          >
            <option value="">Mood (optional)</option>
            <option value="happy">Happy</option>
            <option value="sad">Sad</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <input
            type="date"
            className="bg-white/10 text-white px-3 py-2 rounded-lg"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
            }}
          />
          <input
            type="file"
            accept="image/*"
            className="bg-white/10 text-white px-3 py-2 rounded-lg"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
            }}
          />
          {uploadProgress !== null && (
            <div className="col-span-2">
              <div className="h-2 bg-white/10 rounded">
                <div
                  className="h-2 bg-purple-600 rounded"
                  style={{ width: `${String(uploadProgress)}%` }}
                />
              </div>
              <div className="text-xs text-purple-200 mt-1">
                Uploading: {uploadProgress}%
              </div>
            </div>
          )}
          {uploadError && (
            <div className="col-span-2 text-sm text-red-300">{uploadError}</div>
          )}
        </div>
        <textarea
          placeholder="What do you want to remember?"
          className="bg-white/10 text-white px-3 py-2 rounded-lg w-full min-h-[100px]"
          value={content}
          onChange={(e) => { setContent(e.target.value); }}
        />
        <button
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
        >
          {loading
            ? uploadProgress !== null && uploadProgress < 100
              ? "Uploading..."
              : "Saving..."
            : "Add Memory"}
        </button>

      </form>

      {/* List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((m) => (
          <MemoryCard
            key={m.id}
            m={m}
            onDelete={() => {
              void removeMemory(m.id);
            }}
          />
        ))}
      </div>

      {!user && !isLoading && (
        <p className="text-purple-200">
          Login to create and view your memories.
        </p>
      )}
    </div>
  );
}

function CalendarGrid({
  month,
  counts,
  loading,
  onSelectDate,
}: {
  month: string;
  counts: Record<string, number>;
  loading: boolean;
  onSelectDate: (date: string) => void;
}): React.ReactElement {
  const [yStr, mStr] = month.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const firstDay = first.getUTCDay(); // 0-6 (Sun-Sat)
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const weeks: { dateStr?: string; day?: number; count?: number }[][] = [];
  let week: { dateStr?: string; day?: number; count?: number }[] = [];
  // leading blanks
  for (let i = 0; i < firstDay; i++) week.push({});
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${yStr}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const count = counts[dateStr] ?? 0;
    week.push({ dateStr, day: d, count });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push({});
    weeks.push(week);
  }

  const weekday = ["S", "M", "T", "W", "T", "F", "S"];

  function intensityClass(c: number): string {
    if (!c) return "bg-white/5 hover:bg-white/10";
    if (c === 1) return "bg-purple-600/30 hover:bg-purple-600/40";
    if (c === 2) return "bg-purple-600/50 hover:bg-purple-600/60";
    if (c <= 4) return "bg-purple-600/70 hover:bg-purple-600/80";
    return "bg-purple-600 hover:bg-purple-700";
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 text-center text-xs text-purple-200">
        {weekday.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div
        className={`grid grid-cols-7 gap-1 ${loading ? "animate-pulse" : ""}`}
      >
        {weeks.flatMap((w, wi) =>
          w.map((cell, ci) => (
            <button
              key={`${String(wi)}-${String(ci)}`}
              type="button"
              disabled={!cell.dateStr}
              onClick={() => {
                if (cell.dateStr) {
                  onSelectDate(cell.dateStr);
                }
              }}
              className={`relative aspect-square rounded-md border border-white/10 flex items-center justify-center text-sm text-white/90 ${
                cell.dateStr
                  ? intensityClass(cell.count ?? 0)
                  : "bg-transparent border-transparent"
              } disabled:opacity-50`}
              aria-label={cell.dateStr ? `Select ${cell.dateStr}` : "empty"}
            >
              {cell.day ?? ""}
              {cell.count ? (
                <span className="absolute top-0 right-0 m-1 text-[10px] px-1 rounded bg-black/40 text-white">
                  {cell.count}
                </span>
              ) : null}
            </button>
          )),
        )}
      </div>
    </div>
  );
}

function MemoryCard({ m, onDelete }: { m: Memory; onDelete: () => void }): React.ReactElement {
  return (
    <div className="bg-white/10 rounded-xl p-4 space-y-2 border border-white/10">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-white font-semibold">{m.title ?? "Untitled"}</h3>
          <p className="text-xs text-purple-200">
            {m.memory_date ?? new Date(m.created_at).toISOString().slice(0, 10)}
          </p>
        </div>
        <div className="text-xs px-2 py-1 rounded bg-white/10 text-purple-200">
          {m.mood_tag ?? "neutral"}
        </div>
      </div>
      {m.image_path && <MemoryImage path={m.image_path} />}
      <p className="text-purple-100 whitespace-pre-wrap">{m.content}</p>
      <div className="flex justify-end">
        <button
          onClick={onDelete}
          className="text-red-300 hover:text-red-200 text-sm"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function MemoryImage({ path }: { path: string }): React.ReactElement | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const run = async (): Promise<void> => {
      try {
        const qs = new URLSearchParams({ path });
        const res = await fetch(`/api/memories/signed-url?${qs.toString()}`);
        let data: unknown = null;
        try {
          data = await res.json();
        } catch {
          /* ignore json parse errors */
        }
        if (active && res.ok) {
          const signed =
            data && typeof data === "object" && "signed_url" in data
              ? (data as { signed_url?: unknown }).signed_url
              : undefined;
          if (typeof signed === "string") setUrl(signed);
        }
      } catch {
        /* ignore errors fetching signed url */
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [path]);
  if (!url) return null;
  return (
    <img
      src={url}
      alt="memory"
      className="w-full h-40 object-cover rounded-lg"
    />
  );
}
