"use client";
import React from "react";
import StatCard from "@/react-app/components/admin/StatCard";
import { Users, Eye, MessageSquare, Activity } from "lucide-react";

export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="text-slate-500">
            Overview of traffic, engagement and support.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 items-stretch auto-rows-fr">
        <StatCard
          title="Visitors"
          value={12345}
          subtitle="last 24h"
          Icon={Eye}
          tone="indigo"
        />
        <StatCard
          title="Active Users"
          value={1234}
          subtitle="currently on site"
          Icon={Users}
          tone="emerald"
        />
        <StatCard
          title="Open Tickets"
          value={12}
          subtitle="awaiting response"
          Icon={MessageSquare}
          tone="amber"
        />
        <StatCard
          title="Avg. Response"
          value={"4m"}
          subtitle="last hour"
          Icon={Activity}
          tone="sky"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent Activity</h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li className="flex items-center justify-between">
              <span>New signup: jane@example.com</span>
              <span className="text-xs text-slate-500">2m ago</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Ticket #1023 assigned to Alex</span>
              <span className="text-xs text-slate-500">10m ago</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Traffic spike from social campaign</span>
              <span className="text-xs text-slate-500">35m ago</span>
            </li>
          </ul>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Support Snapshot</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span>Open</span>
              <span className="font-semibold">12</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Unassigned</span>
              <span className="font-semibold">4</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Avg. first reply</span>
              <span className="font-semibold">4m</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
