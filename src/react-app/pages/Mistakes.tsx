"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/react-app/hooks/useCustomAuth";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Mistake {
  id: number;
  title: string;
  description: string | null;
  lesson_learned: string | null;
  status: "open" | "repeated" | "solved";
  occurrence_count: number;
  last_occurred_at: string | null;
}

interface Analytics {
  start: string;
  end: string;
  counts: Record<string, number>;
}

interface CreateMistakePayload {
  title: string;
  description?: string;
  lesson_learned?: string;
}

export default function Mistakes(): React.ReactElement {
  const { user, isLoading } = useAuth();
  const [items, setItems] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [range, setRange] = useState<"weekly" | "monthly" | "90d">("monthly");

  // form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lesson, setLesson] = useState("");

  const canFetch = useMemo(() => !isLoading && !!user, [isLoading, user]);

  useEffect(() => {
    if (!canFetch) return;
    void Promise.all([load(), loadAnalytics()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetch, status, range]);

  async function load(): Promise<void> {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      const res = await fetch(
        `/api/mistakes${qs.toString() ? `?${qs.toString()}` : ""}`,
      );
      if (!res.ok) throw new Error("Failed");
      const data: unknown = await res.json();
      let mistakes: Mistake[] = [];
      if (data && typeof data === "object" && "mistakes" in data) {
        const m = (data as { mistakes?: unknown }).mistakes;
        if (Array.isArray(m)) {
          mistakes = m as Mistake[];
        }
      }
      setItems(mistakes);
    } catch {
      /* ignore errors for guests */
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalytics(): Promise<void> {
    try {
      const qs = new URLSearchParams({ range });
      const res = await fetch(`/api/mistakes/analytics?${qs.toString()}`);
      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        /* ignore parse errors */
      }
      if (res.ok) {
        const val =
          data && typeof data === "object" &&
          "counts" in data && "start" in data && "end" in data
            ? (data as Analytics)
            : null;
        setAnalytics(val);
      }
    } catch {
      /* ignore errors for guests */
    }
  }

  async function createMistake(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to add a mistake");
      return;
    }
    try {
      setLoading(true);
      const payload: CreateMistakePayload = { title };
      if (description) payload.description = description;
      if (lesson) payload.lesson_learned = lesson;
      const res = await fetch("/api/mistakes", {
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
      toast.success("Mistake added");
      setTitle("");
      setDescription("");
      setLesson("");
      await Promise.all([load(), loadAnalytics()]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(
    id: number,
    newStatus: "open" | "repeated" | "solved",
  ): Promise<void> {
    if (!user) {
      toast.error("Please login");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/mistakes/${String(id)}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          increment: newStatus === "repeated",
        }),
      });
      const data: unknown = await res.json();
      let errMsg: string | undefined;
      if (data && typeof data === "object" && "error" in data) {
        const e = (data as { error?: unknown }).error;
        if (typeof e === "string") errMsg = e;
      }
      if (!res.ok) throw new Error(errMsg ?? "Update failed");
      toast.success("Status updated");
      await Promise.all([load(), loadAnalytics()]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function removeMistake(id: number): Promise<void> {
    if (!user) {
      toast.error("Please login");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/mistakes/${String(id)}`, { method: "DELETE" });
      const data: unknown = await res.json();
      let errMsg: string | undefined;
      if (data && typeof data === "object" && "error" in data) {
        const e = (data as { error?: unknown }).error;
        if (typeof e === "string") errMsg = e;
      }
      if (!res.ok) throw new Error(errMsg ?? "Delete failed");
      toast.success("Deleted");
      await Promise.all([load(), loadAnalytics()]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const dataForChart = React.useMemo(() => {
    if (!analytics) return [] as { date: string; count: number }[];
    return Object.entries(analytics.counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
  }, [analytics]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-white">
        Mistakes & Learnings
      </h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm text-purple-200 mb-1">Status</label>
          <select
            className="bg-white/10 text-white px-3 py-2 rounded-lg"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
            }}
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="repeated">Repeated</option>
            <option value="solved">Solved</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-purple-200 mb-1">
            Analytics Range
          </label>
          <select
            className="bg-white/10 text-white px-3 py-2 rounded-lg"
            value={range}
            onChange={(e) => {
              setRange(e.target.value as "weekly" | "monthly" | "90d");
            }}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Create form */}
      <form
        onSubmit={(e) => {
          void createMistake(e);
        }}
        className="bg-white/10 rounded-xl p-4 space-y-3"
      >
        <input
          placeholder="Title"
          className="bg-white/10 text-white px-3 py-2 rounded-lg w-full"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
          }}
        />
        <textarea
          placeholder="Description (optional)"
          className="bg-white/10 text-white px-3 py-2 rounded-lg w-full"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
          }}
        />
        <textarea
          placeholder="Lesson learned (optional)"
          className="bg-white/10 text-white px-3 py-2 rounded-lg w-full"
          value={lesson}
          onChange={(e) => {
            setLesson(e.target.value);
          }}
        />
        <button
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Add"}
        </button>
      </form>

      {/* List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((m) => (
          <div
            key={m.id}
            className="bg-white/10 rounded-xl p-4 space-y-2 border border-white/10"
          >
            <div className="flex justify-between">
              <div>
                <h3 className="text-white font-semibold">{m.title}</h3>
                <p className="text-xs text-purple-200">
                  {m.last_occurred_at ?? "—"}
                </p>
              </div>
              <div className="text-xs px-2 py-1 rounded bg-white/10 text-purple-200">
                {m.status}
              </div>
            </div>
            {m.description && (
              <p className="text-purple-100 whitespace-pre-wrap">
                {m.description}
              </p>
            )}
            {m.lesson_learned && (
              <p className="text-green-200 text-sm">
                Lesson: {m.lesson_learned}
              </p>
            )}
            <div className="flex gap-2 justify-end text-sm">
              <button
                onClick={() => {
                  void updateStatus(m.id, "repeated");
                }}
                className="px-2 py-1 bg-white/10 text-white rounded hover:bg-white/20"
              >
                Mark Repeated
              </button>
              <button
                onClick={() => {
                  void updateStatus(m.id, "solved");
                }}
                className="px-2 py-1 bg-green-600/80 text-white rounded hover:bg-green-600"
              >
                Mark Solved
              </button>
              <button
                onClick={() => {
                  void removeMistake(m.id);
                }}
                className="px-2 py-1 bg-red-600/70 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Chart */}
      <div className="bg-white/10 rounded-xl p-4">
        <h2 className="text-white font-semibold mb-3">Last Occurrences</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataForChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis
                dataKey="date"
                stroke="#ddd"
                tick={{ fill: "#ddd", fontSize: 12 }}
              />
              <YAxis
                stroke="#ddd"
                tick={{ fill: "#ddd", fontSize: 12 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#111827",
                  border: "1px solid #374151",
                  color: "#f9fafb",
                }}
              />
              <Bar dataKey="count" fill="#a78bfa" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {!user && !isLoading && (
        <p className="text-purple-200">
          Login to create and view your mistakes and learnings.
        </p>
      )}
    </div>
  );
}
