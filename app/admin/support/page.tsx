"use client";
import React, { useEffect, useMemo, useState } from "react";

interface Ticket {
  id: string;
  subject: string;
  status: "open" | "closed";
  customer: string;
  created_at: string;
  assigned_to?: string | null;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "open" | "closed">("all");

  useEffect(() => {
    fetch("/api/admin/support/tickets", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setTickets(d.tickets || []);
      })
      .catch(() => {
        setTickets([]);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return tickets.filter((t) => {
      if (tab !== "all" && t.status !== tab) return false;
      if (!q) return true;
      return (
        t.subject.toLowerCase().includes(q) ||
        t.customer.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    });
  }, [tickets, query, tab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Support
          </h1>
          <p className="text-slate-500">
            Manage conversations and customer emails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-slate-200 px-3 py-2">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
              placeholder="Search"
              className="bg-transparent text-sm outline-none"
            />
          </div>
          <div className="rounded-xl border border-slate-200 p-1 text-sm">
            {(["all", "open", "closed"] as const).map((k) => (
              <button
                key={k}
                onClick={() => {
                  setTab(k);
                }}
                className={`rounded-lg px-3 py-1 capitalize ${tab === k ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-2 sm:p-3">
        <ul className="divide-y divide-slate-100">
          {filtered.map((t) => (
            <li
              key={t.id}
              className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">
                  {t.subject}
                </p>
                <p className="truncate text-sm text-slate-500">
                  #{t.id} • {t.customer}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.status === "open" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
                >
                  {t.status}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(t.created_at).toLocaleString()}
                </span>
              </div>
            </li>
          ))}
          {!filtered.length && (
            <li className="p-6 text-center text-sm text-slate-500">
              No tickets
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
