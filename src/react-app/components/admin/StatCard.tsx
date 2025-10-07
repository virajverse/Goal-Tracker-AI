"use client";
import React from "react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  Icon: LucideIcon;
  tone?: "indigo" | "sky" | "emerald" | "amber" | "slate";
}

const toneMap: Record<NonNullable<StatCardProps["tone"]>, string> = {
  indigo: "from-indigo-500 to-indigo-600",
  sky: "from-sky-500 to-sky-600",
  emerald: "from-emerald-500 to-emerald-600",
  amber: "from-amber-500 to-amber-600",
  slate: "from-slate-500 to-slate-600",
};

export default function StatCard({
  title,
  value,
  subtitle,
  Icon,
  tone = "slate",
}: StatCardProps): React.ReactElement {
  return (
    <div className="w-full h-full rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className={`hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${toneMap[tone]} text-white shadow`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {subtitle ? (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
