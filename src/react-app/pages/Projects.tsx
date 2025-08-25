"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Toaster, toast } from "react-hot-toast";
import { useAuth } from "@/react-app/hooks/useCustomAuth";

// Types
type ProjectStatus = "upcoming" | "ongoing" | "completed" | "archived";

type Project = {
  id: number;
  user_id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  tech_stack: string[];
  deadline: string | null;
  priority: 1 | 2 | 3;
  created_at: string;
  updated_at: string;
};

type ProjectNote = {
  id: number;
  user_id: string;
  project_id: number;
  note_text: string;
  created_at: string;
};

const statusOptions: ProjectStatus[] = [
  "upcoming",
  "ongoing",
  "completed",
  "archived",
];

const priorityOptions: Array<{ value: 1 | 2 | 3; label: string }> = [
  { value: 1, label: "High" },
  { value: 2, label: "Medium" },
  { value: 3, label: "Low" },
];

function clsx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function ProjectsPage() {
  const { user, isLoading } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | "all">(
    "all"
  );

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "upcoming" as ProjectStatus,
    deadline: "",
    priority: 2 as 1 | 2 | 3,
    techStackInput: "",
  });

  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(
    null
  );
  const [notesByProject, setNotesByProject] = useState<
    Record<number, ProjectNote[]>
  >({});
  const [notesLoading, setNotesLoading] = useState<Record<number, boolean>>({});
  const [newNoteText, setNewNoteText] = useState<Record<number, string>>({});

  // UX: search and sorting controls
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"priority" | "deadline" | "created_at" | "title">("priority");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const visibleProjects = useMemo(() => {
    // filter by status (server already filters, but keep client safety)
    let list = filterStatus === "all" ? projects : projects.filter((p) => p.status === filterStatus);

    // search filter
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const hay = [
          p.title,
          p.description || "",
          Array.isArray(p.tech_stack) ? p.tech_stack.join(", ") : "",
        ]
          .join("\n")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    // sorting
    const dir = sortDir === "asc" ? 1 : -1;
    const sorted = [...list].sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      switch (sortBy) {
        case "priority":
          av = a.priority;
          bv = b.priority;
          break;
        case "deadline": {
          const noDeadlineRank = sortDir === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
          const ad = a.deadline ? Date.parse(a.deadline) : noDeadlineRank;
          const bd = b.deadline ? Date.parse(b.deadline) : noDeadlineRank;
          av = ad;
          bv = bd;
          break;
        }
        case "created_at":
          av = Date.parse(a.created_at);
          bv = Date.parse(b.created_at);
          break;
        case "title":
          av = a.title.toLowerCase();
          bv = b.title.toLowerCase();
          break;
      }
      if (typeof av === "string" && typeof bv === "string") {
        return av.localeCompare(bv) * dir;
      }
      return ((av as number) - (bv as number)) * dir;
    });

    return sorted;
  }, [projects, filterStatus, search, sortBy, sortDir]);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setError(null);
      return;
    }
    void loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filterStatus]);

  async function loadProjects() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const qs = filterStatus !== "all" ? `?status=${filterStatus}` : "";
      const res = await fetch(`/api/projects${qs}`, { cache: "no-store" });
      if (res.status === 401) {
        setError("Please log in to view your projects.");
        setProjects([]);
        return;
      }
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const json = await res.json();
      setProjects(json.projects || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  function parseTechStack(input: string): string[] {
    return input
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Please log in to create a project.");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setCreating(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority,
        tech_stack: parseTechStack(form.techStackInput),
      };
      if (form.deadline) payload.deadline = form.deadline;

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create project");
      toast.success("Project created");
      setShowCreate(false);
      setForm({
        title: "",
        description: "",
        status: "upcoming",
        deadline: "",
        priority: 2,
        techStackInput: "",
      });
      await loadProjects();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  async function updateProject(id: number, updates: Partial<Project>) {
    if (!user) {
      toast.error("Please log in to update a project.");
      return;
    }
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update project");
      toast.success("Saved");
      setProjects((prev) => prev.map((p) => (p.id === id ? json.project : p)));
    } catch (e: any) {
      toast.error(e?.message || "Failed to update project");
    }
  }

  async function deleteProject(id: number) {
    if (!user) {
      toast.error("Please log in to delete a project.");
      return;
    }
    if (!confirm("Delete this project?")) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to delete project");
      toast.success("Deleted");
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (expandedProjectId === id) setExpandedProjectId(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete project");
    }
  }

  async function loadNotes(projectId: number) {
    if (!user) return;
    setNotesLoading((s) => ({ ...s, [projectId]: true }));
    try {
      const res = await fetch(`/api/projects/${projectId}/notes`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const json = await res.json();
      setNotesByProject((prev) => ({ ...prev, [projectId]: json.notes || [] }));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load notes");
    } finally {
      setNotesLoading((s) => ({ ...s, [projectId]: false }));
    }
  }

  async function addNote(projectId: number) {
    if (!user) {
      toast.error("Please log in to add notes.");
      return;
    }
    const text = (newNoteText[projectId] || "").trim();
    if (!text) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note_text: text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add note");
      setNewNoteText((s) => ({ ...s, [projectId]: "" }));
      setNotesByProject((prev) => ({
        ...prev,
        [projectId]: [json.note, ...(prev[projectId] || [])],
      }));
      toast.success("Note added");
    } catch (e: any) {
      toast.error(e?.message || "Failed to add note");
    }
  }

  function PriorityBadge({ value }: { value: 1 | 2 | 3 }) {
    const label = priorityOptions.find((p) => p.value === value)?.label || value;
    const color = value === 1 ? "red" : value === 2 ? "yellow" : "blue";
    return (
      <span
        className={clsx(
          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
          color === "red" && "bg-red-500/20 text-red-200",
          color === "yellow" && "bg-yellow-500/20 text-yellow-100",
          color === "blue" && "bg-blue-500/20 text-blue-100"
        )}
        title={`Priority: ${label}`}
      >
        {label}
      </span>
    );
  }

  // Loading skeleton for better UX
  function SkeletonCard() {
    return (
      <div className="animate-pulse bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
        <div className="h-5 bg-white/10 rounded w-2/3" />
        <div className="flex gap-2">
          <div className="h-4 bg-white/10 rounded w-20" />
          <div className="h-4 bg-white/10 rounded w-16" />
          <div className="h-4 bg-white/10 rounded w-24" />
        </div>
        <div className="h-4 bg-white/10 rounded w-full" />
        <div className="h-4 bg-white/10 rounded w-5/6" />
        <div className="h-8 bg-white/10 rounded w-32 ml-auto" />
      </div>
    );
  }

  function StatusBadge({ value }: { value: ProjectStatus }) {
    const colorMap: Record<ProjectStatus, string> = {
      upcoming: "bg-slate-500/20 text-slate-100",
      ongoing: "bg-indigo-500/20 text-indigo-100",
      completed: "bg-emerald-500/20 text-emerald-100",
      archived: "bg-zinc-500/20 text-zinc-100",
    };
    return (
      <span className={clsx("inline-flex rounded-md px-2 py-0.5 text-xs", colorMap[value])}>
        {value}
      </span>
    );
  }

  function ProjectCard({ project }: { project: Project }) {
    const [editing, setEditing] = useState(false);
    const [edit, setEdit] = useState({
      title: project.title,
      description: project.description || "",
      status: project.status as ProjectStatus,
      deadline: project.deadline ? project.deadline.slice(0, 10) : "",
      priority: project.priority as 1 | 2 | 3,
      techStackInput: (project.tech_stack || []).join(", "),
    });

    useEffect(() => {
      setEdit({
        title: project.title,
        description: project.description || "",
        status: project.status,
        deadline: project.deadline ? project.deadline.slice(0, 10) : "",
        priority: project.priority,
        techStackInput: (project.tech_stack || []).join(", "),
      });
    }, [project]);

    const isExpanded = expandedProjectId === project.id;

    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white placeholder-purple-200/70"
                placeholder="Project title"
                value={edit.title}
                onChange={(e) => setEdit((s) => ({ ...s, title: e.target.value }))}
                autoFocus
                aria-label="Project title"
              />
            ) : (
              <h3 className="text-white font-semibold text-lg break-words">
                {project.title}
              </h3>
            )}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <StatusBadge value={editing ? edit.status : project.status} />
              <PriorityBadge value={editing ? edit.priority : project.priority} />
              {(editing ? edit.deadline : project.deadline) && (
                <span className="text-xs text-purple-200">
                  Due {format(parseISO((editing ? edit.deadline : project.deadline)!), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {editing ? (
              <>
                <button
                  onClick={() => {
                    if (!edit.title.trim()) {
                      toast.error("Title is required");
                      return;
                    }
                    void updateProject(project.id, {
                      title: edit.title.trim(),
                      description: edit.description.trim() || null,
                      status: edit.status,
                      deadline: edit.deadline || null,
                      priority: edit.priority,
                      tech_stack: parseTechStack(edit.techStackInput),
                    }).then(() => setEditing(false));
                  }}
                  className="px-3 py-1.5 rounded-md bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 rounded-md bg-white/10 text-white hover:bg-white/20 text-sm"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1.5 rounded-md bg-white/10 text-white hover:bg-white/20 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => void deleteProject(project.id)}
                  className="px-3 py-1.5 rounded-md bg-red-500/20 text-red-100 hover:bg-red-500/30 text-sm"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        <div>
          {editing ? (
            <textarea
              className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white placeholder-purple-200/70 min-h-[72px]"
              placeholder="Description (optional)"
              value={edit.description}
              onChange={(e) => setEdit((s) => ({ ...s, description: e.target.value }))}
            />
          ) : (
            <p className="text-purple-100/80 whitespace-pre-wrap">
              {project.description || "No description"}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <select
                className="bg-white/10 border border-white/20 rounded-md px-2 py-1 text-white text-sm"
                value={edit.status}
                onChange={(e) =>
                  setEdit((s) => ({ ...s, status: e.target.value as ProjectStatus }))
                }
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                className="bg-white/10 border border-white/20 rounded-md px-2 py-1 text-white text-sm"
                value={edit.priority}
                onChange={(e) =>
                  setEdit((s) => ({ ...s, priority: Number(e.target.value) as 1 | 2 | 3 }))
                }
              >
                {priorityOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="bg-white/10 border border-white/20 rounded-md px-2 py-1 text-white text-sm"
                value={edit.deadline}
                onChange={(e) => setEdit((s) => ({ ...s, deadline: e.target.value }))}
              />
              <input
                className="flex-1 min-w-[220px] bg-white/10 border border-white/20 rounded-md px-3 py-1.5 text-white placeholder-purple-200/70 text-sm"
                placeholder="Tech stack (comma separated)"
                value={edit.techStackInput}
                onChange={(e) =>
                  setEdit((s) => ({ ...s, techStackInput: e.target.value }))
                }
              />
            </>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {(project.tech_stack || []).length > 0 ? (
                project.tech_stack.map((t, i) => (
                  <span
                    key={`${t}-${i}`}
                    className="inline-flex items-center rounded-md bg-white/10 px-2 py-0.5 text-xs text-white"
                  >
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-xs text-purple-200">No tech stack</span>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="pt-2 border-t border-white/10">
          <button
            className="text-sm text-purple-200 hover:text-white underline"
            onClick={() => {
              const willExpand = isExpanded ? null : project.id;
              setExpandedProjectId(willExpand);
              if (willExpand && !notesByProject[project.id]) {
                void loadNotes(project.id);
              }
            }}
          >
            {isExpanded ? "Hide Notes" : "Show Notes"}
          </button>

          {isExpanded && (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white placeholder-purple-200/70 text-sm"
                  placeholder="Add a note"
                  value={newNoteText[project.id] || ""}
                  onChange={(e) =>
                    setNewNoteText((s) => ({ ...s, [project.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void addNote(project.id);
                    }
                  }}
                  disabled={notesLoading[project.id]}
                  aria-label="Add a note"
                />
                <button
                  onClick={() => void addNote(project.id)}
                  className="px-3 py-2 rounded-md bg-white/10 text-white hover:bg-white/20 text-sm"
                  disabled={notesLoading[project.id]}
                >
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {(notesByProject[project.id] || []).length === 0 ? (
                  <p className="text-sm text-purple-200">No notes yet</p>
                ) : (
                  (notesByProject[project.id] || []).map((n) => (
                    <div
                      key={n.id}
                      className="bg-white/5 border border-white/10 rounded-md px-3 py-2"
                    >
                      <div className="text-sm text-white whitespace-pre-wrap">
                        {n.note_text}
                      </div>
                      <div className="text-[11px] text-purple-200 mt-1">
                        {format(parseISO(n.created_at), "MMM d, yyyy • h:mm a")}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Toaster position="top-right" />

      <div>
        <h1 className="text-2xl font-bold text-white">Projects</h1>
        <p className="text-purple-200 mt-1">
          Organize your work, track progress, and add learnings as notes.
        </p>
      </div>

      {!user && !isLoading && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-purple-100">
            You are browsing as a guest. Please use the "Login / Sign Up" button
            in the header to sign in and view your projects.
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap flex-1">
          {/* Search */}
          <input
            className="flex-1 min-w-[220px] bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white placeholder-purple-200/70 text-sm"
            placeholder="Search projects, description, tech stack"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search projects"
          />

          {/* Status filter */}
          <label className="text-sm text-purple-200">Status</label>
          <select
            className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            disabled={!user}
            aria-label="Filter by status"
          >
            <option value="all">All</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Sort by */}
          <label className="text-sm text-purple-200">Sort</label>
          <select
            className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            aria-label="Sort by"
          >
            <option value="priority">Priority</option>
            <option value="deadline">Deadline</option>
            <option value="created_at">Created</option>
            <option value="title">Title</option>
          </select>
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="px-3 py-2 rounded-md bg-white/10 text-white hover:bg-white/20 text-sm"
            title={`Sort ${sortDir === "asc" ? "ascending" : "descending"}`}
            aria-label="Toggle sort direction"
          >
            {sortDir === "asc" ? "Asc" : "Desc"}
          </button>

          {/* Clear filters */}
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setFilterStatus("all");
            }}
            className="px-3 py-2 rounded-md bg-white/10 text-white hover:bg-white/20 text-sm disabled:opacity-50"
            disabled={!search && filterStatus === "all"}
          >
            Clear
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadProjects()}
            className="px-3 py-2 rounded-md bg-white/10 text-white hover:bg-white/20 text-sm"
            disabled={!user || loading}
          >
            Refresh
          </button>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50"
            disabled={!user}
          >
            {showCreate ? "Close" : "New Project"}
          </button>
        </div>
      </div>

      {showCreate && (
        <form
          onSubmit={createProject}
          className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-purple-200">Title</label>
              <input
                className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white placeholder-purple-200/70"
                placeholder="e.g. Portfolio Website"
                value={form.title}
                onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-purple-200">Status</label>
              <select
                className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white"
                value={form.status}
                onChange={(e) =>
                  setForm((s) => ({ ...s, status: e.target.value as ProjectStatus }))
                }
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-purple-200">Priority</label>
              <select
                className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white"
                value={form.priority}
                onChange={(e) =>
                  setForm((s) => ({ ...s, priority: Number(e.target.value) as 1 | 2 | 3 }))
                }
              >
                {priorityOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-purple-200">Deadline</label>
              <input
                type="date"
                className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white"
                value={form.deadline}
                onChange={(e) => setForm((s) => ({ ...s, deadline: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-purple-200">Description</label>
            <textarea
              className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white placeholder-purple-200/70 min-h-[90px]"
              placeholder="Brief description of the project"
              value={form.description}
              onChange={(e) =>
                setForm((s) => ({ ...s, description: e.target.value }))
              }
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-purple-200">
              Tech stack (comma separated)
            </label>
            <input
              className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white placeholder-purple-200/70"
              placeholder="e.g. React, Next.js, Tailwind, Supabase"
              value={form.techStackInput}
              onChange={(e) =>
                setForm((s) => ({ ...s, techStackInput: e.target.value }))
              }
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
              disabled={creating}
            >
              {creating ? "Creating..." : "Create Project"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-3">
        {isLoading || loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-red-200">{error}</div>
        ) : visibleProjects.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-purple-100 flex flex-col items-start gap-3">
            <div className="text-white text-lg font-semibold">No projects found</div>
            <div className="text-sm text-purple-200">
              {search || filterStatus !== "all"
                ? "No projects match your filters. Try clearing search or status."
                : "Get started by creating your first project."}
            </div>
            <div className="flex items-center gap-2">
              {(search || filterStatus !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilterStatus("all");
                  }}
                  className="px-3 py-2 rounded-md bg-white/10 text-white hover:bg-white/20 text-sm"
                >
                  Clear filters
                </button>
              )}
              {user && (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="px-3 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-500 text-sm"
                >
                  Create project
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleProjects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
