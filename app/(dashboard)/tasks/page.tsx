"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid, List, Plus, Search, Loader2, Lock,
  CheckCircle2, Clock, CircleDashed, Eye, ChevronRight,
  Layers, FileText, X, Sparkles, Menu, ChevronDown,
  UserPlus, Calendar, Flag, GitMerge
} from "lucide-react";
import TaskModal from "@/src/components/tasks/TaskModal";

const spring = { type: "spring", stiffness: 400, damping: 30 } as const;

const STATUS_ICONS: Record<string, any> = {
  DONE: CheckCircle2, IN_PROGRESS: Clock, REVIEW: Eye, TODO: CircleDashed,
};

function statusColor(color: string) {
  const map: Record<string, string> = {
    "text-green-400": "#4ade80", "text-blue-400": "#60a5fa",
    "text-yellow-400": "#facc15", "text-red-400": "#f87171",
    "text-purple-400": "#c084fc", "text-cyan-400": "#22d3ee",
    gray: "#6b7280",
  };
  return map[color] || "#6b7280";
}

// ─── Inline assignee picker ────────────────────────────────────────────────────
function AssigneePicker({ assignees, users, onChange }: { assignees: any[]; users: any[]; onChange: (ids: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggle = (uid: string) => {
    const ids = assignees.map((a: any) => typeof a === "string" ? a : a._id);
    const updated = ids.includes(uid) ? ids.filter(id => id !== uid) : [...ids, uid];
    onChange(updated);
  };

  const assigneeIds = assignees.map((a: any) => typeof a === "string" ? a : a._id);

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-1 hover:opacity-80 transition-opacity">
        {assignees.length > 0 ? (
          <div className="flex -space-x-1.5">
            {assignees.slice(0, 2).map((a: any, i) => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-surface bg-gradient-to-br from-cyan/40 to-violet/30 flex items-center justify-center text-[8px] font-bold text-white overflow-hidden" title={a.name}>
                {a.avatar ? <img src={a.avatar} className="w-full h-full object-cover" alt="" /> : a.name?.[0]}
              </div>
            ))}
            {assignees.length > 2 && <div className="w-6 h-6 rounded-full border-2 border-surface bg-muted/20 flex items-center justify-center text-[8px] text-muted font-bold">+{assignees.length - 2}</div>}
          </div>
        ) : (
          <UserPlus size={13} className="text-muted/40 hover:text-muted transition-colors" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.12 }}
            className="absolute top-full mt-1 left-0 z-50 bg-surface border border-muted/15 rounded-xl shadow-2xl min-w-[160px] py-1 overflow-hidden">
            {users.map(u => {
              const checked = assigneeIds.includes(u._id);
              return (
                <button key={u._id} onClick={() => toggle(u._id)} className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted/5 transition-colors text-left ${checked ? "text-foreground" : "text-muted"}`}>
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan/40 to-violet/30 flex items-center justify-center text-[7px] font-bold text-white overflow-hidden shrink-0">
                    {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" alt="" /> : u.name?.[0]}
                  </div>
                  <span className="flex-1 truncate font-medium">{u.name}</span>
                  {checked && <div className="w-1.5 h-1.5 rounded-full bg-cyan shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Inline date picker ────────────────────────────────────────────────────────
function DatePicker({ value, onChange }: { value: string | null; onChange: (d: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const formatted = value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null;
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => inputRef.current?.showPicker?.()} className="flex items-center gap-1 text-muted/50 hover:text-muted transition-colors">
        {formatted ? <span className="text-[11px] text-foreground/70">{formatted}</span> : <Calendar size={13} />}
      </button>
      <input
        ref={inputRef}
        type="date"
        value={value ? new Date(value).toISOString().split("T")[0] : ""}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
      />
    </div>
  );
}

// ─── Approval Screen ──────────────────────────────────────────────────────────
function ApprovalScreen({ page, onApprove, onReject }: { page: any; onApprove: () => void; onReject: () => void }) {
  const [loading, setLoading] = useState<null | "approve" | "reject">(null);
  const act = async (type: "approve" | "reject") => {
    setLoading(type);
    if (type === "approve") {
      const r = await fetch(`/api/pages/${page._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approval_status: "APPROVED" }) });
      if ((await r.json()).success) onApprove();
    } else {
      const r = await fetch(`/api/pages/${page._id}`, { method: "DELETE" });
      if ((await r.json()).success) onReject();
    }
    setLoading(null);
  };
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center"><Lock size={24} className="text-amber-500" /></div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold text-foreground">"{page.name}" is Pending</h2>
        <p className="text-sm text-muted max-w-xs">Review and approve this project to allow the team to add tasks.</p>
        {page.description && <p className="text-sm text-muted/70 max-w-sm bg-muted/5 border border-muted/10 rounded-xl p-4 italic mt-2">"{page.description}"</p>}
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
        <button onClick={() => act("approve")} disabled={!!loading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
          {loading === "approve" ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Approve
        </button>
        <button onClick={() => act("reject")} disabled={!!loading} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold text-sm hover:bg-red-500/20 transition-all disabled:opacity-50">
          {loading === "reject" ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />} Reject
        </button>
      </div>
    </motion.div>
  );
}

// ─── List Row ────────────────────────────────────────────────────────────────
function ListRow({
  task, depth, activeStatuses, users, onOpen, onUpdate, allTasks, onExpand, expanded
}: {
  task: any; depth: number; activeStatuses: any[]; users: any[];
  onOpen: (id: string) => void; onUpdate: (t: any) => void;
  allTasks: any[]; onExpand: (id: string) => void; expanded: Set<string>;
}) {
  const subtaskCount = allTasks.filter(t => String(t.parent_task_id) === String(task._id)).length;
  const isExpanded = expanded.has(String(task._id));

  const patchTask = async (updates: any) => {
    const res = await fetch(`/api/tasks/${task._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
    const json = await res.json();
    if (json.success) onUpdate(json.data);
  };

  const tStatus = activeStatuses.find(s => s.name === task.status);
  const hex = tStatus ? statusColor(tStatus.color) : "#6b7280";

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex items-center gap-2 px-3 py-2.5 border-b border-muted/5 hover:bg-muted/5 transition-colors group cursor-pointer ${depth > 0 ? "pl-" + (depth * 6 + 3) : ""}`}
        style={{ paddingLeft: depth * 24 + 12 }}
        onClick={() => onOpen(String(task._id))}
      >
        {/* Expand subtasks toggle */}
        <button
          className={`shrink-0 w-4 h-4 flex items-center justify-center text-muted/40 hover:text-muted transition-colors ${subtaskCount === 0 ? "invisible" : ""}`}
          onClick={e => { e.stopPropagation(); onExpand(String(task._id)); }}
        >
          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.12 }}>
            <ChevronRight size={11} />
          </motion.div>
        </button>

        {/* Status dot */}
        <div className="shrink-0 w-3 h-3 rounded-full border-2 transition-colors" style={{ borderColor: hex }} />

        {/* Title */}
        <span className="flex-1 text-sm font-medium text-foreground truncate group-hover:text-cyan transition-colors">
          {task.title}
        </span>

        {/* Subtask badge */}
        {subtaskCount > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-muted shrink-0 px-1.5 py-0.5 rounded-full bg-muted/10 border border-muted/10">
            <GitMerge size={9} />
            {subtaskCount}
          </div>
        )}

        {/* Assignee */}
        <div className="shrink-0 w-20 flex justify-center" onClick={e => e.stopPropagation()}>
          <AssigneePicker
            assignees={task.assignee_ids || []}
            users={users}
            onChange={ids => patchTask({ assignee_ids: ids })}
          />
        </div>

        {/* Due date */}
        <div className="shrink-0 w-24 flex justify-center" onClick={e => e.stopPropagation()}>
          <DatePicker
            value={task.due_date || null}
            onChange={d => patchTask({ due_date: d })}
          />
        </div>

        {/* Priority placeholder */}
        <div className="shrink-0 w-20 hidden sm:flex justify-center">
          <Flag size={12} className="text-muted/25" />
        </div>
      </motion.div>

      {/* Subtasks */}
      <AnimatePresence>
        {isExpanded && allTasks
          .filter(t => String(t.parent_task_id) === String(task._id))
          .map(sub => (
            <ListRow
              key={String(sub._id)}
              task={sub}
              depth={depth + 1}
              activeStatuses={activeStatuses}
              users={users}
              onOpen={onOpen}
              onUpdate={onUpdate}
              allTasks={allTasks}
              onExpand={onExpand}
              expanded={expanded}
            />
          ))
        }
      </AnimatePresence>
    </>
  );
}

// ─── Grouped List View ────────────────────────────────────────────────────────
function GroupedListView({
  tasks, activeStatuses, users, onOpen, onTaskUpdated, onAddTask
}: {
  tasks: any[]; activeStatuses: any[]; users: any[];
  onOpen: (id: string) => void; onTaskUpdated: (t: any) => void;
  onAddTask: (status: string) => void;
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleGroup = (s: string) =>
    setCollapsedGroups(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
  const toggleExpand = (id: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const rootTasks = tasks.filter(t => !t.parent_task_id);

  return (
    <div className="space-y-3 max-w-full">
      {activeStatuses.map((col: any) => {
        const hex = statusColor(col.color);
        const Icon = STATUS_ICONS[col.name] || CircleDashed;
        const colTasks = rootTasks.filter(t => (t.status || "TODO") === col.name);
        const isCollapsed = collapsedGroups.has(col.name);
        return (
          <div key={col.name} className="rounded-xl border border-muted/10 overflow-hidden bg-surface/40">
            {/* Group header */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-muted/[0.03] border-b border-muted/10">
              <button onClick={() => toggleGroup(col.name)} className="flex items-center gap-2 flex-1 min-w-0">
                <motion.div animate={{ rotate: isCollapsed ? -90 : 0 }} transition={{ duration: 0.15 }}>
                  <ChevronDown size={13} className="text-muted shrink-0" />
                </motion.div>
                <Icon size={13} style={{ color: hex }} className="shrink-0" />
                <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: hex }}>{col.name}</span>
                <span className="text-[10px] text-muted font-bold bg-muted/10 px-1.5 py-0.5 rounded-full ml-1">{colTasks.length}</span>
              </button>
            </div>

            {/* Column headers */}
            {!isCollapsed && (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-muted/5 text-[10px] font-bold uppercase tracking-wider text-muted/50">
                  <div className="w-4 shrink-0" />
                  <div className="w-3 shrink-0" />
                  <div className="flex-1">Name</div>
                  <div className="w-20 text-center shrink-0">Assignee</div>
                  <div className="w-24 text-center shrink-0">Due date</div>
                  <div className="w-20 text-center shrink-0 hidden sm:block">Priority</div>
                </div>

                {/* Rows */}
                {colTasks.map(t => (
                  <ListRow
                    key={String(t._id)}
                    task={t}
                    depth={0}
                    activeStatuses={activeStatuses}
                    users={users}
                    onOpen={onOpen}
                    onUpdate={onTaskUpdated}
                    allTasks={tasks}
                    onExpand={toggleExpand}
                    expanded={expanded}
                  />
                ))}

                {/* Add task inline */}
                <button
                  onClick={() => onAddTask(col.name)}
                  className="flex items-center gap-2 px-4 py-2 text-xs text-muted/50 hover:text-muted hover:bg-muted/5 transition-colors w-full border-t border-muted/5"
                >
                  <Plus size={11} />
                  Add Task
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const { data: session } = useSession();
  const isAdmin =
    (session?.user as any)?.role?.level === "ADMIN" ||
    (session?.user as any)?.userType === "SUPER_ADMIN";

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"KANBAN" | "LIST">("LIST");

  const [boards, setBoards] = useState<any[]>([]);
  const [expandedBoards, setExpandedBoards] = useState<Set<string>>(new Set());
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<any | null>(null);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingForStatus, setAddingForStatus] = useState<string | null>(null);

  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [isRequestPageOpen, setIsRequestPageOpen] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageDesc, setNewPageDesc] = useState("");

  // ── Fetchers ──────────────────────────────────────────────────────────────────
  const fetchBoards = useCallback(async () => {
    const res = await fetch("/api/boards"); const json = await res.json();
    if (json.success && json.data.length > 0) {
      setBoards(json.data);
      setSelectedBoardId(json.data[0]._id);
      setExpandedBoards(new Set([json.data[0]._id]));
    }
  }, []);
  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/team?limit=100"); const json = await res.json();
    if (json.success && Array.isArray(json.data?.users)) setUsers(json.data.users);
  }, []);
  const fetchPages = useCallback(async (boardId: string) => {
    const res = await fetch(`/api/pages?boardId=${boardId}`); const json = await res.json();
    if (json.success) {
      setPages(json.data);
      const first = json.data.find((p: any) => p.approval_status === "APPROVED") || json.data[0] || null;
      setSelectedPageId(first?._id || null); setSelectedPage(first);
    }
  }, []);
  const fetchTasks = useCallback(async (boardId: string, pageId: string) => {
    setLoading(true);
    const res = await fetch(`/api/tasks?boardId=${boardId}&pageId=${pageId}`); const json = await res.json();
    if (json.success) setTasks(json.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBoards(); fetchUsers(); }, [fetchBoards, fetchUsers]);
  useEffect(() => { if (selectedBoardId) fetchPages(selectedBoardId); }, [selectedBoardId, fetchPages]);
  useEffect(() => {
    if (selectedBoardId && selectedPageId && selectedPage?.approval_status === "APPROVED") fetchTasks(selectedBoardId, selectedPageId);
    else { setTasks([]); setLoading(false); }
  }, [selectedBoardId, selectedPageId, selectedPage, fetchTasks]);

  const handleSelectPage = (page: any) => { setSelectedPageId(page._id); setSelectedPage(page); setSidebarOpen(false); };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    const res = await fetch("/api/boards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newBoardName.trim(), members: users.map(u => u._id) }) });
    const json = await res.json();
    if (json.success) { setBoards(prev => [...prev, json.data]); setSelectedBoardId(json.data._id); setExpandedBoards(prev => new Set([...prev, json.data._id])); setNewBoardName(""); setIsCreateBoardOpen(false); }
  };

  const handleRequestPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageName.trim() || !selectedBoardId) return;
    const res = await fetch("/api/pages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newPageName.trim(), description: newPageDesc.trim(), board_id: selectedBoardId }) });
    const json = await res.json();
    if (json.success) { setPages(prev => [...prev, json.data]); setNewPageName(""); setNewPageDesc(""); setIsRequestPageOpen(false); }
  };

  const handleApproveProject = () => {
    setPages(prev => prev.map(p => p._id === selectedPageId ? { ...p, approval_status: "APPROVED" } : p));
    setSelectedPage((prev: any) => ({ ...prev, approval_status: "APPROVED" }));
    if (selectedBoardId && selectedPageId) fetchTasks(selectedBoardId, selectedPageId);
  };
  const handleRejectProject = () => {
    const remaining = pages.filter(p => p._id !== selectedPageId);
    setPages(remaining);
    const next = remaining.find(p => p.approval_status === "APPROVED") || null;
    setSelectedPageId(next?._id || null); setSelectedPage(next);
  };

  const handleCreateTask = async (e: React.FormEvent, statusOverride?: string) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedBoardId || !selectedPageId) return;
    setIsCreating(true);
    const board = boards.find(b => b._id === selectedBoardId);
    const status = statusOverride || board?.statuses?.[0]?.name || "TODO";
    const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTaskTitle, board_id: selectedBoardId, page_id: selectedPageId, status }) });
    const json = await res.json();
    if (json.success) { setTasks(prev => [json.data, ...prev]); setNewTaskTitle(""); setAddingForStatus(null); }
    setIsCreating(false);
  };

  const handleTaskUpdated = (updatedTask: any) => {
    if (updatedTask.deleted) setTasks(prev => prev.filter(t => String(t._id) !== String(updatedTask._id)));
    else setTasks(prev => prev.map(t => String(t._id) === String(updatedTask._id) ? updatedTask : t));
  };

  const activeStatuses = boards.find(b => b._id === selectedBoardId)?.statuses || [];
  const filteredTasks = tasks.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()));
  const isPendingPage = selectedPage?.approval_status === "PENDING";
  const pendingCount = pages.filter(p => p.approval_status === "PENDING").length;

  // ─── Sidebar content ──────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <>
      <div className="px-4 py-3 border-b border-muted/10 flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted/60">Workspaces</span>
        <div className="flex items-center gap-1">
          {isAdmin && (
            <button onClick={() => setIsCreateBoardOpen(true)} className="p-1 rounded-lg hover:bg-muted/10 text-muted/50 hover:text-foreground transition-colors" title="New Board">
              <Plus size={13} />
            </button>
          )}
          <button className="sm:hidden p-1 rounded-lg hover:bg-muted/10 text-muted" onClick={() => setSidebarOpen(false)}>
            <X size={14} />
          </button>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 no-scrollbar">
        {boards.map(board => {
          const isExpanded = expandedBoards.has(board._id);
          const isActiveBrd = selectedBoardId === board._id;
          return (
            <div key={board._id}>
              <button
                onClick={() => {
                  setSelectedBoardId(board._id);
                  setExpandedBoards(prev => { const n = new Set(prev); isExpanded ? n.delete(board._id) : n.add(board._id); return n; });
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${isActiveBrd ? "bg-cyan/10 text-cyan" : "text-muted hover:text-foreground hover:bg-muted/5"}`}
              >
                <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
                  <ChevronRight size={11} className="shrink-0" />
                </motion.div>
                <Layers size={12} className="shrink-0" />
                <span className="flex-1 text-left truncate">{board.name}</span>
                {isAdmin && pendingCount > 0 && isActiveBrd && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20 font-bold animate-pulse">{pendingCount}</span>
                )}
              </button>
              <AnimatePresence>
                {isExpanded && isActiveBrd && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden ml-4 pl-2 border-l border-muted/10 mt-0.5 mb-0.5 space-y-0.5">
                    {pages.map(page => {
                      const isPending = page.approval_status === "PENDING";
                      const isActivePg = selectedPageId === page._id;
                      const canClick = isAdmin || !isPending;
                      return (
                        <div key={page._id} className="relative group/page">
                          <button
                            onClick={() => canClick && handleSelectPage(page)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${isActivePg ? "bg-cyan/10 text-cyan font-semibold" : isPending ? "text-amber-500/70 cursor-not-allowed" : "text-muted hover:text-foreground hover:bg-muted/5"} ${!canClick ? "pointer-events-none" : ""}`}
                          >
                            <FileText size={11} className="shrink-0" />
                            <span className="flex-1 text-left truncate">{page.name}</span>
                            {isPending && isAdmin && <span className="text-[8px] px-1 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20 font-bold animate-pulse">Review</span>}
                            {isPending && !isAdmin && <Lock size={10} className="text-amber-500/60 animate-pulse" />}
                          </button>
                          {isPending && !isAdmin && (
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 hidden group-hover/page:block pointer-events-none">
                              <div className="bg-surface border border-muted/15 rounded-lg px-2.5 py-1.5 text-[10px] text-foreground shadow-xl whitespace-nowrap">Pending Admin Approval</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <button onClick={() => setIsRequestPageOpen(true)} className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-muted/60 hover:text-muted hover:bg-muted/5 transition-all border border-dashed border-muted/20 hover:border-muted/30 mt-1">
                      <Plus size={10} />{isAdmin ? "New Project" : "Request Project"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background overflow-hidden relative">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:hidden" />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={spring} className="fixed top-0 left-0 bottom-0 z-50 w-56 bg-surface border-r border-muted/10 flex flex-col sm:hidden shadow-2xl">
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden sm:flex w-52 lg:w-60 shrink-0 flex-col border-r border-muted/10 bg-surface overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-muted/10 bg-surface/80 backdrop-blur-md gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="sm:hidden p-1.5 rounded-lg hover:bg-muted/10 text-muted shrink-0"><Menu size={16} /></button>
            <h1 className="text-sm font-bold text-foreground flex items-center gap-1.5 truncate">
              {selectedPage ? (
                <>
                  <span className="text-muted hidden sm:inline truncate max-w-[80px]">{boards.find(b => b._id === selectedBoardId)?.name}</span>
                  <ChevronRight size={11} className="text-muted/40 hidden sm:inline shrink-0" />
                  <span className="truncate max-w-[120px] sm:max-w-none">{selectedPage.name}</span>
                  {isPendingPage && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold shrink-0">PENDING</span>}
                </>
              ) : "Tasks"}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative hidden sm:block">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/50" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="bg-muted/5 border border-muted/15 rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted/40 focus:outline-none focus:border-cyan/40 w-40 lg:w-48 transition-all" />
            </div>
            <div className="flex items-center bg-muted/5 border border-muted/10 rounded-xl p-0.5 gap-0.5">
              <button onClick={() => setView("KANBAN")} className={`p-1.5 rounded-[9px] transition-colors ${view === "KANBAN" ? "bg-cyan/10 text-cyan" : "text-muted hover:text-foreground"}`}><LayoutGrid size={13} /></button>
              <button onClick={() => setView("LIST")} className={`p-1.5 rounded-[9px] transition-colors ${view === "LIST" ? "bg-cyan/10 text-cyan" : "text-muted hover:text-foreground"}`}><List size={13} /></button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          {isPendingPage ? (
            isAdmin ? <ApprovalScreen page={selectedPage} onApprove={handleApproveProject} onReject={handleRejectProject} />
              : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center gap-3 text-muted p-8">
                  <Lock size={32} className="text-amber-500/40" />
                  <p className="text-sm font-semibold text-amber-500">Awaiting admin approval.</p>
                </motion.div>
              )
          ) : (
            <>
              {/* Add task bar */}
              {selectedPageId && !addingForStatus && (
                <div className="shrink-0 px-4 pt-3 pb-2">
                  <form onSubmit={handleCreateTask} className="flex items-center gap-2 max-w-lg">
                    <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="+ Add a task…" className="flex-1 bg-muted/5 border border-muted/15 rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-cyan/40 transition-all" />
                    <button disabled={isCreating || !newTaskTitle.trim()} className="p-2 btn-primary rounded-xl disabled:opacity-40 shrink-0">
                      {isCreating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                    </button>
                  </form>
                </div>
              )}

              {/* Quick-add for status group */}
              {addingForStatus && (
                <div className="shrink-0 px-4 pt-3 pb-2">
                  <form onSubmit={e => handleCreateTask(e, addingForStatus)} className="flex items-center gap-2 max-w-lg">
                    <div className="flex-1 flex items-center gap-2 bg-muted/5 border border-muted/15 rounded-xl px-4 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted/60">{addingForStatus}:</span>
                      <input autoFocus value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Task name…" className="flex-1 text-sm bg-transparent text-foreground placeholder:text-muted/40 focus:outline-none" />
                    </div>
                    <button type="button" onClick={() => { setAddingForStatus(null); setNewTaskTitle(""); }} className="p-2 rounded-xl hover:bg-muted/10 text-muted"><X size={14} /></button>
                    <button disabled={isCreating || !newTaskTitle.trim()} className="p-2 btn-primary rounded-xl disabled:opacity-40 shrink-0">
                      {isCreating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                    </button>
                  </form>
                </div>
              )}

              <div className="flex-1 overflow-auto no-scrollbar p-4 pt-2">
                {loading ? (
                  <div className="flex items-center justify-center h-full"><Loader2 size={22} className="animate-spin text-cyan" /></div>
                ) : view === "LIST" ? (
                  <GroupedListView
                    tasks={filteredTasks}
                    activeStatuses={activeStatuses}
                    users={users}
                    onOpen={id => setSelectedTaskId(id)}
                    onTaskUpdated={handleTaskUpdated}
                    onAddTask={status => { setAddingForStatus(status); setNewTaskTitle(""); }}
                  />
                ) : (
                  // Kanban
                  <div className="flex gap-4 h-full pb-4" style={{ minWidth: `${activeStatuses.length * 280}px` }}>
                    {activeStatuses.map((col: any) => {
                      const Icon = STATUS_ICONS[col.name] || CircleDashed;
                      const hex = statusColor(col.color);
                      const colTasks = filteredTasks.filter(t => !t.parent_task_id && (t.status || "TODO") === col.name);
                      return (
                        <div key={col.name} className="flex flex-col shrink-0 rounded-2xl border border-muted/10 bg-surface/60 overflow-hidden" style={{ width: "272px" }}>
                          <div className="px-4 py-3 flex items-center justify-between border-b border-muted/10">
                            <div className="flex items-center gap-2">
                              <Icon size={13} style={{ color: hex }} />
                              <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: hex }}>{col.name}</span>
                            </div>
                            <span className="text-[10px] text-muted font-bold bg-muted/10 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                          </div>
                          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 no-scrollbar">
                            <AnimatePresence>
                              {colTasks.map(t => (
                                <motion.div key={String(t._id)} layout layoutId={String(t._id)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={spring} onClick={() => setSelectedTaskId(String(t._id))} className="bg-surface border border-muted/10 rounded-xl p-3.5 cursor-pointer hover:border-cyan/30 hover:shadow-sm transition-all group">
                                  <h4 className="text-[13px] font-semibold text-foreground group-hover:text-cyan transition-colors mb-3 leading-snug">{t.title}</h4>
                                  <div className="flex items-center justify-between">
                                    <div className="flex -space-x-1.5">
                                      {t.assignee_ids?.slice(0, 3).map((a: any, i: number) => (
                                        <div key={i} title={a.name} className="w-5 h-5 rounded-full border border-surface bg-gradient-to-br from-cyan/30 to-violet/20 flex items-center justify-center text-[7px] font-bold text-white overflow-hidden">
                                          {a.avatar ? <img src={a.avatar} alt="" className="w-full h-full object-cover" /> : a.name?.[0]}
                                        </div>
                                      ))}
                                    </div>
                                    {t.due_date && <span className="text-[10px] text-muted flex items-center gap-1"><Clock size={9} />{new Date(t.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* ── MODALS ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isCreateBoardOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreateBoardOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }} transition={spring} className="relative bg-surface border border-muted/15 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center gap-3 mb-5"><div className="w-8 h-8 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center"><Layers size={14} className="text-cyan" /></div><h3 className="text-base font-bold text-foreground">New Board</h3></div>
              <form onSubmit={handleCreateBoard} className="space-y-4">
                <input autoFocus value={newBoardName} onChange={e => setNewBoardName(e.target.value)} placeholder="Board name…" className="w-full bg-muted/5 border border-muted/15 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-cyan/40" />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setIsCreateBoardOpen(false)} className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors">Cancel</button>
                  <button type="submit" disabled={!newBoardName.trim()} className="btn-primary px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-40">Create</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRequestPageOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRequestPageOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }} transition={spring} className="relative bg-surface border border-muted/15 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">{isAdmin ? <FileText size={14} className="text-emerald-500" /> : <Sparkles size={14} className="text-emerald-500" />}</div>
                <div><h3 className="text-base font-bold text-foreground">{isAdmin ? "New Project" : "Request Project"}</h3>{!isAdmin && <p className="text-[10px] text-muted mt-0.5">Sent to Admin for approval</p>}</div>
              </div>
              <form onSubmit={handleRequestPage} className="space-y-3">
                <input autoFocus value={newPageName} onChange={e => setNewPageName(e.target.value)} placeholder="Project name…" className="w-full bg-muted/5 border border-muted/15 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-cyan/40" />
                {!isAdmin && <textarea value={newPageDesc} onChange={e => setNewPageDesc(e.target.value)} placeholder="Justification (optional)" rows={3} className="w-full bg-muted/5 border border-muted/15 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-cyan/40 resize-none" />}
                <div className="flex gap-2 justify-end pt-1">
                  <button type="button" onClick={() => setIsRequestPageOpen(false)} className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors">Cancel</button>
                  <button type="submit" disabled={!newPageName.trim()} className="btn-primary px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-40">{isAdmin ? "Create" : "Send Request"}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TaskModal
        isOpen={!!selectedTaskId}
        taskId={selectedTaskId as string}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={handleTaskUpdated}
        users={users}
        boardStatuses={boards.find(b => b._id === selectedBoardId)?.statuses || []}
        boardName={boards.find(b => b._id === selectedBoardId)?.name}
        pageName={selectedPage?.name}
      />
    </div>
  );
}
