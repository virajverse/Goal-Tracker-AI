"use client";
import React, { useEffect, useState } from "react";

interface Ticket {
  id: string;
  subject: string;
  status: "open" | "closed";
  customer: string;
  created_at: string;
  assigned_to?: string | null;
}

export default function AgentInboxPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Inbox
        </h1>
        <p className="text-slate-500">Tickets assigned to your team.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-2 sm:p-3">
        <ul className="divide-y divide-slate-100">
          {tickets.map((t) => (
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
          {!tickets.length && (
            <li className="p-6 text-center text-sm text-slate-500">
              No tickets
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
