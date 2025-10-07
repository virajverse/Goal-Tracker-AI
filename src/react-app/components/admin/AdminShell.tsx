"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Folder,
  Users2,
  LifeBuoy,
  Settings,
  LogOut,
  Search,
  Mail,
  UserCircle2,
  FileText,
} from "lucide-react";

interface AdminShellProps {
  children: React.ReactNode;
  requireRole?: "admin" | "agent"; // when "agent" allow both agent and admin
}

type Role = "admin" | "agent" | "user";
interface MeUser { name?: string; email?: string; role?: Role }
interface MeResponse { user: MeUser | null }

async function fetchMe(): Promise<MeResponse> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object" && "user" in body) {
      const u = (body as { user?: unknown }).user;
      if (!u || typeof u !== "object") return { user: null };
      const o = u as Record<string, unknown>;
      const name = typeof o.name === "string" ? o.name : undefined;
      const email = typeof o.email === "string" ? o.email : undefined;
      const role: Role | undefined =
        o.role === "admin" || o.role === "agent" || o.role === "user"
          ? (o.role as Role)
          : undefined;
      return { user: { name, email, role } };
    }
  } catch {
    /* ignore */
  }
  return { user: null };
}

export default function AdminShell({
  children,
  requireRole = "admin",
}: AdminShellProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const data = await fetchMe();
      const u = data.user;
      setUser(u);
      setLoading(false);
      if (!u) return;
      const role = u.role ?? "user";
      const allowAgent = requireRole === "agent";
      const allowed = role === "admin" || (allowAgent && role === "agent");
      if (!allowed) router.replace("/");
    })();
  }, [requireRole, router]);

  const isAgent = pathname.startsWith("/agent");
  const nav = isAgent
    ? [{ label: "Inbox", href: "/agent", icon: LifeBuoy }]
    : [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
        { label: "Projects", href: "/admin/projects", icon: Folder },
        { label: "Team", href: "/admin/team", icon: Users2 },
        { label: "Migrations", href: "/admin/migrations", icon: FileText },
        { label: "Support", href: "/admin/support", icon: LifeBuoy },
        { label: "Settings", href: "/admin/settings", icon: Settings },
      ];

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full gap-6 p-4 sm:p-6">
        {/* Sidebar */}
        <aside className="sticky top-4 h-[calc(100vh-2rem)] w-20 shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:w-64">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 p-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white font-bold">
                GT
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold">
                  {isAgent ? "Agent" : "Admin"}
                </p>
                <p className="text-xs text-slate-500">GoalTracker</p>
              </div>
            </div>
            {!isAgent && (
              <div className="my-2 hidden sm:block px-3">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-slate-500">
                  <Search className="h-4 w-4" />
                  <input
                    placeholder="Search"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
            )}
            <nav className="mt-2 flex-1 space-y-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto space-y-2 p-3">
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2">
                <UserCircle2 className="h-8 w-8 text-slate-400" />
                <div className="hidden min-w-0 sm:block">
                  <p className="truncate text-sm font-medium">
                    {user?.name ?? user?.email ?? "User"}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {user?.role ?? "user"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  void fetch("/api/auth/logout", { method: "POST" }).then(() => {
                    router.replace("/");
                  });
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1">{children}</main>

        {/* Right panel (widgets) */}
        {!isAgent && (
          <aside className="hidden w-80 shrink-0 lg:block">
            <div className="sticky top-4 mt-16 xl:mt-20 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium">Team Snapshot</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Agents online</span>
                    <span className="font-semibold">3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Open tickets</span>
                    <span className="font-semibold">12</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Avg. response</span>
                    <span className="font-semibold">4m</span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium">Quick Actions</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    href="/admin/support"
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <LifeBuoy className="h-4 w-4" />
                    Support
                  </Link>
                  <Link
                    href="/admin/settings"
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <Link
                    href="/admin/analytics"
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </Link>
                  <Link
                    href="/admin/support"
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <Mail className="h-4 w-4" />
                    Inbox
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
