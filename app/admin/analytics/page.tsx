"use client";
import React, { useEffect, useState } from "react";

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<any | null>(null);
  useEffect(() => {
    fetch("/api/admin/analytics/summary", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setSummary(d);
      })
      .catch(() => {
        setSummary(null);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Analytics
        </h1>
        <p className="text-slate-500">Traffic and conversions overview.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <p className="text-sm font-medium">Key Metrics</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-slate-500">Visitors</p>
              <p className="text-xl font-bold">{summary?.visitors ?? "—"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-slate-500">Signups</p>
              <p className="text-xl font-bold">{summary?.signups ?? "—"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-slate-500">Conversion</p>
              <p className="text-xl font-bold">
                {summary?.conv_rate != null ? `${summary.conv_rate}%` : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-slate-500">Active Agents</p>
              <p className="text-xl font-bold">
                {summary?.active_agents ?? "—"}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <p className="text-sm font-medium">Notes</p>
          <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
            <li>Peaks around 9-11am and 6-8pm.</li>
            <li>Social ads campaign correlates with signups.</li>
            <li>Mobile accounts for ~68% of traffic.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
