"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Role = "user" | "agent" | "admin";
interface UserRow {
  id: string;
  email: string | null;
  name?: string;
  role: Role;
  created_at?: string;
}

export default function TeamPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/admin/users/list", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.users || []);
      })
      .catch(() => {
        setUsers([]);
      });
  }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    if (!s) return users;
    return users.filter(
      (u) =>
        (u.email || "").toLowerCase().includes(s) ||
        (u.name || "").toLowerCase().includes(s),
    );
  }, [users, q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Team
          </h1>
          <p className="text-slate-500">
            All users with roles. Click to view projects.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 px-3 py-2">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
            }}
            placeholder="Search by email or name"
            className="bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-2 sm:p-3">
        <ul className="divide-y divide-slate-100">
          {filtered.map((u) => (
            <li
              key={u.id}
              className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/team/${u.id}`}
                  className="font-medium text-slate-900 hover:underline truncate block"
                >
                  {u.name || u.email || u.id}
                </Link>
                <p className="truncate text-xs text-slate-500">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.role === "admin" ? "bg-indigo-100 text-indigo-800" : u.role === "agent" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"}`}
                >
                  {u.role}
                </span>
                {u.created_at && (
                  <span className="text-xs text-slate-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </li>
          ))}
          {!filtered.length && (
            <li className="p-6 text-center text-sm text-slate-500">
              No users found
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
