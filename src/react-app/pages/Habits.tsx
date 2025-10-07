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

interface Habit {
  id: number;
  user_id: string;
  name: string;
  habit_type: "good" | "bad";
  frequency: "daily" | "weekly" | "monthly";
  is_active: boolean;
  created_at: string;
}

interface AggStats {
  start: string;
  end: string;
  bucket: "daily" | "weekly" | "monthly";
  type: "all" | "good" | "bad";
  series: { date: string; done: number }[];
  total: number;
}

// Logs returned by `/api/habits/:id/logs`
interface HabitLog {
  log_date: string;
  is_done: boolean;
}

// API response helpers
interface HabitsListJson {
  habits?: Habit[];
  error?: unknown;
}
interface AggStatsJson extends Partial<AggStats> {
  error?: unknown;
}
interface LogsJson {
  logs?: HabitLog[];
  error?: unknown;
}
interface StreakJson {
  streak?: unknown;
  error?: unknown;
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error?: unknown }).error;
    if (typeof err === "string") return err;
  }
  return fallback;
}

function extractHabits(data: unknown): Habit[] {
  if (data && typeof data === "object" && "habits" in data) {
    const h = (data as HabitsListJson).habits;
    if (Array.isArray(h)) return h;
  }
  return [];
}

function extractAggStats(data: unknown): AggStats | null {
  if (data && typeof data === "object") {
    const a = data as AggStatsJson;
    if (
      typeof a.start === "string" &&
      typeof a.end === "string" &&
      (a.bucket === "daily" ||
        a.bucket === "weekly" ||
        a.bucket === "monthly") &&
      (a.type === "all" || a.type === "good" || a.type === "bad") &&
      Array.isArray(a.series) &&
      typeof a.total === "number"
    ) {
      return a as AggStats;
    }
  }
  return null;
}

function extractLogs(data: unknown): HabitLog[] {
  if (data && typeof data === "object" && "logs" in data) {
    const l = (data as LogsJson).logs;
    if (Array.isArray(l)) return l;
  }
  return [];
}

function extractStreak(data: unknown): number | null {
  if (data && typeof data === "object" && "streak" in data) {
    const s = (data as StreakJson).streak;
    if (typeof s === "number") return s;
  }
  return null;
}

export default function Habits(): React.ReactElement {
  const { user, isLoading } = useAuth();
  const [items, setItems] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<string>("");
  const [active, setActive] = useState<string>("true");

  // create form
  const [name, setName] = useState("");
  const [habitType, setHabitType] = useState<"good" | "bad">("good");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">(
    "daily",
  );

  // aggregated stats controls
  const [bucket, setBucket] = useState<"daily" | "weekly" | "monthly">("daily");
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [aggType, setAggType] = useState<"all" | "good" | "bad">("all");
  const [agg, setAgg] = useState<AggStats | null>(null);

  // per-habit indicators
  const [todayMap, setTodayMap] = useState<Record<number, boolean>>({});
  const [streakMap, setStreakMap] = useState<Record<number, number>>({});
  const todayStr = useMemo(() => {
    const t = new Date();
    const yyyy = t.getUTCFullYear();
    const mm = String(t.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(t.getUTCDate()).padStart(2, "0");
    return `${String(yyyy)}-${mm}-${dd}`;
  }, []);

  const canFetch = useMemo(() => !isLoading && !!user, [isLoading, user]);

  useEffect(() => {
    if (!canFetch) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetch, type, active]);

  useEffect(() => {
    if (!canFetch) return;
    void loadAgg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetch, bucket, range, aggType]);

  async function load(): Promise<void> {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (type) qs.set("type", type);
      if (active) qs.set("active", active);
      const res = await fetch(
        `/api/habits${qs.toString() ? `?${qs.toString()}` : ""}`,
      );
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        /* ignore json parse error */
      }
      if (!res.ok) {
        const msg = extractErrorMessage(body, "Failed");
        throw new Error(msg);
      }
      const list: Habit[] = extractHabits(body);
      setItems(list);
      // refresh per-habit indicators
      if (list.length) await loadTodayAndStreak(list);
    } catch (err) {
      console.warn("Failed to load habits", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAgg(): Promise<void> {
    try {
      const qs = new URLSearchParams();
      qs.set("bucket", bucket);
      qs.set("range", range);
      if (aggType === "good" || aggType === "bad") qs.set("type", aggType);
      const res = await fetch(`/api/habits/stats?${qs.toString()}`);
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        /* ignore json parse error */
      }
      if (res.ok) {
        const a = extractAggStats(body);
        if (a) setAgg(a);
      }
    } catch (err) {
      console.warn("Failed to load aggregate stats", err);
    }
  }

  async function loadTodayAndStreak(list: Habit[]): Promise<void> {
    try {
      // Fetch in parallel
      await Promise.all(
        list.map(async (h) => {
          const id = h.id;
          try {
            // today status
            const resT = await fetch(
              `/api/habits/${String(id)}/logs?start=${todayStr}&end=${todayStr}`,
            );
            let jt: unknown = null;
            try {
              jt = await resT.json();
            } catch {
              /* ignore json parse error */
            }
            if (resT.ok) {
              const logs = extractLogs(jt);
              const isDone = Boolean(
                logs.find((l: HabitLog) => l.log_date === todayStr)?.is_done,
              );
              setTodayMap((prev) => ({ ...prev, [id]: isDone }));
            }
          } catch (err) {
            console.warn("Failed to fetch today logs", err);
          }

          try {
            // streak (daily, 90d window)
            const resS = await fetch(
              `/api/habits/${String(id)}/stats?bucket=${h.frequency}&range=90d`,
            );
            let js: unknown = null;
            try {
              js = await resS.json();
            } catch {
              /* ignore json parse error */
            }
            if (resS.ok) {
              const st = extractStreak(js);
              if (typeof st === "number") {
                setStreakMap((prev) => ({ ...prev, [id]: st }));
              }
            }
          } catch (err) {
            console.warn("Failed to fetch streak stats", err);
          }
        }),
      );
    } catch (err) {
      console.warn("Failed to fetch today/streak indicators", err);
    }
  }

  async function createHabit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to create a habit");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, habit_type: habitType, frequency }),
      });
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        /* ignore json parse error */
      }
      if (!res.ok) {
        const msg = extractErrorMessage(body, "Create failed");
        throw new Error(msg);
      }
      toast.success("Habit created");
      setName("");
      setHabitType("good");
      setFrequency("daily");
      await Promise.all([load(), loadAgg()]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function markToday(id: number, done: boolean): Promise<void> {
    if (!user) {
      toast.error("Please login");
      return;
    }
    try {
      const date = todayStr;
      const res = await fetch(`/api/habits/${String(id)}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, is_done: done }),
      });
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        /* ignore json parse error */
      }
      if (!res.ok) {
        const msg = extractErrorMessage(body, "Failed");
        throw new Error(msg);
      }
      toast.success(done ? "Marked done" : "Unmarked");
      // Update indicators and agg
      setTodayMap((prev) => ({ ...prev, [id]: done }));
      try {
        const h = items.find((i) => i.id === id);
        const bucket = h?.frequency ?? "daily";
        const resS = await fetch(
          `/api/habits/${String(id)}/stats?bucket=${bucket}&range=90d`,
        );
        let js: unknown = null;
        try {
          js = await resS.json();
        } catch {
          /* ignore json parse error */
        }
        if (resS.ok) {
          const st = extractStreak(js);
          if (typeof st === "number")
            setStreakMap((prev) => ({ ...prev, [id]: st }));
        }
      } catch (err) {
        console.warn("Failed to refresh streak after markToday", err);
      }
      await loadAgg();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update";
      toast.error(msg);
    }
  }

  async function toggleActive(habit: Habit): Promise<void> {
    if (!user) {
      toast.error("Please login");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/habits/${String(habit.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !habit.is_active }),
      });
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        /* ignore json parse error */
      }
      if (!res.ok) {
        const msg = extractErrorMessage(body, "Update failed");
        throw new Error(msg);
      }
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function removeHabit(id: number): Promise<void> {
    if (!user) {
      toast.error("Please login");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/habits/${String(id)}`, { method: "DELETE" });
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        /* ignore json parse error */
      }
      if (!res.ok) {
        const msg = extractErrorMessage(body, "Delete failed");
        throw new Error(msg);
      }
      toast.success("Deleted");
      await Promise.all([load(), loadAgg()]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const chartData = useMemo(
    () => (agg?.series ?? []).map((s) => ({ date: s.date, value: s.done })),
    [agg],
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-white">Habits</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm text-purple-200 mb-1">Type</label>
          <select
            className="bg-white/10 text-white px-3 py-2 rounded-lg"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
            }}
          >
            <option value="">All</option>
            <option value="good">Good</option>
            <option value="bad">Bad</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-purple-200 mb-1">Active</label>
          <select
            className="bg-white/10 text-white px-3 py-2 rounded-lg"
            value={active}
            onChange={(e) => {
              setActive(e.target.value);
            }}
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Create form */}
      <form
        onSubmit={(e) => {
          void createHabit(e);
        }}
        className="bg-white/10 rounded-xl p-4 space-y-3"
      >
        <div className="grid md:grid-cols-3 gap-3">
          <input
            placeholder="Habit name"
            className="bg-white/10 text-white px-3 py-2 rounded-lg"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
          <select
            className="bg-white/10 text-white px-3 py-2 rounded-lg"
            value={habitType}
            onChange={(e) => {
              setHabitType(e.target.value as "good" | "bad");
            }}
          >
            <option value="good">Good</option>
            <option value="bad">Bad</option>
          </select>
          <select
            className="bg-white/10 text-white px-3 py-2 rounded-lg"
            value={frequency}
            onChange={(e) => {
              setFrequency(e.target.value as "daily" | "weekly" | "monthly");
            }}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <button
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Add Habit"}
        </button>
      </form>

      {/* List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((h) => (
          <div
            key={h.id}
            className="bg-white/10 rounded-xl p-4 space-y-2 border border-white/10"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-white font-semibold">{h.name}</h3>
                <p className="text-xs text-purple-200">
                  {h.habit_type} • {h.frequency}
                </p>
              </div>
              <div
                className={`text-xs px-2 py-1 rounded ${h.is_active ? "bg-green-500/20 text-green-200" : "bg-white/10 text-purple-200"}`}
              >
                {h.is_active ? "Active" : "Inactive"}
              </div>
            </div>
            <div className="flex gap-2 text-xs">
              <span
                className={`px-2 py-1 rounded ${todayMap[h.id] ? "bg-green-500/20 text-green-200" : "bg-white/10 text-purple-200"}`}
              >
                Today: {todayMap[h.id] ? "Done" : "Not done"}
              </span>
              <span className="px-2 py-1 rounded bg-white/10 text-purple-200">
                Streak: {streakMap[h.id] ?? 0}
              </span>
            </div>
            <div className="flex gap-2 justify-end text-sm">
              <button
                onClick={() => {
                  void markToday(h.id, true);
                }}
                className="px-2 py-1 bg-white/10 text-white rounded hover:bg-white/20"
              >
                Mark Done Today
              </button>
              <button
                onClick={() => {
                  void markToday(h.id, false);
                }}
                className="px-2 py-1 bg-white/10 text-white rounded hover:bg-white/20"
              >
                Unmark Today
              </button>
              <button
                onClick={() => {
                  void toggleActive(h);
                }}
                className="px-2 py-1 bg-white/10 text-white rounded hover:bg-white/20"
              >
                {h.is_active ? "Deactivate" : "Activate"}
              </button>
              <button
                onClick={() => {
                  void removeHabit(h.id);
                }}
                className="px-2 py-1 bg-red-600/70 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Aggregated Stats */}
      <div className="bg-white/10 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm text-purple-200 mb-1">Bucket</label>
            <select
              className="bg-white/10 text-white px-3 py-2 rounded-lg"
              value={bucket}
              onChange={(e) => {
                setBucket(e.target.value as "daily" | "weekly" | "monthly");
              }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-purple-200 mb-1">Range</label>
            <select
              className="bg-white/10 text-white px-3 py-2 rounded-lg"
              value={range}
              onChange={(e) => {
                setRange(e.target.value as "7d" | "30d" | "90d");
              }}
            >
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-purple-200 mb-1">Type</label>
            <select
              className="bg-white/10 text-white px-3 py-2 rounded-lg"
              value={aggType}
              onChange={(e) => {
                setAggType(e.target.value as "all" | "good" | "bad");
              }}
            >
              <option value="all">All</option>
              <option value="good">Good</option>
              <option value="bad">Bad</option>
            </select>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
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
              <Bar dataKey="value" fill="#34d399" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {!user && !isLoading && (
        <p className="text-purple-200">Login to create and view your habits.</p>
      )}
    </div>
  );
}
