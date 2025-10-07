"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Role = "user" | "agent" | "admin";
interface UserDetail {
  id: string;
  email: string | null;
  name?: string;
  role: Role;
  created_at?: string;
  last_sign_in_at?: string | null;
}
interface ProjectRow {
  id: number;
  title: string;
  description: string | null;
  status: "upcoming" | "ongoing" | "completed" | "archived";
  deadline: string | null;
  tech_stack: string[];
  priority: number;
  created_at: string;
  updated_at: string;
}

export default function TeamMemberPage({ params }: any) {
  // const params = useParams() as { id?: string }; // Remove this line as we're getting params from props
  const userId = params.id || "";
  const [user, setUser] = useState<UserDetail | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/admin/users/${userId}`, { cache: "no-store" }).then((r) =>
        r.json(),
      ),
      fetch(`/api/admin/users/${userId}/projects`, { cache: "no-store" }).then(
        (r) => r.json(),
      ),
    ])
      .then(([u, p]) => {
        setUser(u.user || null);
        setProjects(p.projects || []);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      upcoming: 0,
      ongoing: 0,
      completed: 0,
      archived: 0,
    };
    projects.forEach((pr: ProjectRow) => {
      counts[pr.status] = (counts[pr.status] || 0) + 1;
    });
    return counts as {
      upcoming: number;
      ongoing: number;
      completed: number;
      archived: number;
    };
  }, [projects]);

  const monthlySeries = useMemo(() => {
    // Group by YYYY-MM
    const map = new Map<string, number>();
    projects.forEach((pr: ProjectRow) => {
      const d = new Date(pr.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    // Get last 6 months timeline
    const now = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      months.push(key);
    }
    return months.map((m) => ({ month: m, count: map.get(m) || 0 }));
  }, [projects]);

  const statusBadge = (status: ProjectRow["status"]) => (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        status === "completed"
          ? "bg-emerald-100 text-emerald-800"
          : status === "ongoing"
            ? "bg-indigo-100 text-indigo-800"
            : status === "upcoming"
              ? "bg-amber-100 text-amber-800"
              : "bg-slate-100 text-slate-800"
      }`}
    >
      {status}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-slate-500">
            <Link href="/admin/team" className="hover:underline">
              Team
            </Link>{" "}
            / Member
          </div>
          <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">
            {user?.name || user?.email || "Member"}
          </h1>
          {user?.email && (
            <p className="truncate text-slate-500">{user.email}</p>
          )}
        </div>
        {user && (
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${user.role === "admin" ? "bg-indigo-100 text-indigo-800" : user.role === "agent" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"}`}
          >
            {user.role}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Upcoming</p>
          <p className="text-2xl font-semibold text-slate-900">
            {statusCounts.upcoming}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Ongoing</p>
          <p className="text-2xl font-semibold text-slate-900">
            {statusCounts.ongoing}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Completed</p>
          <p className="text-2xl font-semibold text-slate-900">
            {statusCounts.completed}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Archived</p>
          <p className="text-2xl font-semibold text-slate-900">
            {statusCounts.archived}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-2 sm:p-3">
        <h2 className="px-1 text-lg font-semibold text-slate-900">Projects</h2>
        <ul className="divide-y divide-slate-100">
          {projects.map((pr: ProjectRow) => (
            <li
              key={pr.id}
              className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">
                  {pr.title}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {pr.description || "No description"}
                  {pr.deadline
                    ? ` • Due ${new Date(pr.deadline).toLocaleDateString()}`
                    : ""}
                </p>
                {pr.tech_stack.length ? (
                  <p className="truncate text-xs text-slate-400">
                    {pr.tech_stack.join(", ")}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(pr.status)}
                <span className="text-xs text-slate-500">
                  {new Date(pr.created_at).toLocaleDateString()}
                </span>
              </div>
            </li>
          ))}
          {!projects.length && !loading && (
            <li className="p-6 text-center text-sm text-slate-500">
              No projects yet
            </li>
          )}
          {loading && (
            <li className="p-6 text-center text-sm text-slate-500">
              Loading...
            </li>
          )}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-2 sm:p-3">
        <h2 className="px-1 text-lg font-semibold text-slate-900">
          Projects per month
        </h2>
        <div className="h-64 w-full">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monthlySeries}
                margin={{ top: 10, right: 20, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
          {!mounted && (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Loading chart...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
