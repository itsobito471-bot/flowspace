"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid, List, Plus, Search, Loader2, Lock,
  CheckCircle2, Clock, CircleDashed, Eye, ChevronRight,
  Layers, FileText, X, Sparkles, Menu, ChevronDown,
  UserPlus, Calendar, Flag, GitMerge, Trash2, Settings2, GripVertical, Circle, Pencil
} from "lucide-react";
import TaskModal from "@/src/components/tasks/TaskModal";

const spring = { type: "spring", stiffness: 400, damping: 30 } as const;

const STATUS_ICONS: Record<string, any> = {
  DONE: CheckCircle2, IN_PROGRESS: Clock, REVIEW: Eye, TODO: CircleDashed,
};

function statusColor(color: string) {
  // If already a hex/rgb color, pass through directly (custom statuses)
  if (color && (color.startsWith("#") || color.startsWith("rgb"))) return color;
  const map: Record<string, string> = {
    "text-green-400": "#4ade80", "text-blue-400": "#60a5fa",
    "text-yellow-400": "#facc15", "text-red-400": "#f87171",
    "text-purple-400": "#c084fc", "text-cyan-400": "#22d3ee",
    "text-amber-400": "#fbbf24", "text-emerald-400": "#34d399",
    "text-muted": "#6b7280", gray: "#6b7280",
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
            className="absolute top-full mt-1 left-0 z-50 bg-surface border border-muted/15 rounded-xl shadow-2xl min-w-[160px] py-1 max-h-48 overflow-y-auto">
            {users.length === 0 ? (
              <div className="px-3 py-2 text-[10px] text-muted text-center italic">No users found</div>
            ) : (
              users.map(u => {
                const checked = assigneeIds.includes(u._id) || assigneeIds.includes(u);
                return (
                  <button key={u._id} onClick={() => toggle(u._id)} className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted/5 transition-colors text-left ${checked ? "text-foreground" : "text-muted"}`}>
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan/40 to-violet/30 flex items-center justify-center text-[7px] font-bold text-white overflow-hidden shrink-0">
                      {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" alt="" /> : u.name?.[0]}
                    </div>
                    <span className="flex-1 truncate font-medium">{u.name}</span>
                    {checked && <div className="w-1.5 h-1.5 rounded-full bg-cyan shrink-0" />}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Inline priority picker ──────────────────────────────────────────────────
function PriorityPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const priorities = [
    { value: "URGENT", label: "Urgent", color: "text-red-500" },
    { value: "HIGH", label: "High", color: "text-amber-500" },
    { value: "NORMAL", label: "Normal", color: "text-blue-500" },
    { value: "LOW", label: "Low", color: "text-slate-400" },
  ];

  const current = priorities.find(p => p.value === value) || priorities[2];

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(v => !v)} className="flex items-center justify-center p-1 rounded hover:bg-muted/10 transition-colors">
        <Flag size={12} className={current.color} />
      </button>
      <AnimatePresence>
        {open && (
           <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.12 }}
            className="absolute top-full mt-1 right-0 sm:left-auto sm:right-0 z-50 bg-surface border border-muted/15 rounded-xl shadow-2xl min-w-[120px] py-1 overflow-hidden">
            {priorities.map(p => (
              <button key={p.value} onClick={() => { onChange(p.value); setOpen(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted/5 transition-colors text-left ${value === p.value ? "text-foreground bg-muted/5" : "text-muted"}`}>
                <Flag size={11} className={p.color} />
                <span className="flex-1 font-medium">{p.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Inline status picker ───────────────────────────────────────────────────
function StatusPicker({ value, activeStatuses, onChange }: { value: string; activeStatuses: any[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const current = activeStatuses.find(s => s.name === value);
  const hex = current ? statusColor(current.color) : "#6b7280";

  return (
    <div ref={ref} className="relative shrink-0 flex items-center justify-center p-1" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(v => !v)} className="hover:scale-110 transition-transform">
        <div className="w-3 h-3 rounded-full border-2 transition-colors" style={{ borderColor: hex }} />
      </button>
      <AnimatePresence>
        {open && (
           <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.12 }}
            className="absolute top-full mt-1 left-0 z-50 bg-surface border border-muted/15 rounded-xl shadow-2xl min-w-[150px] py-1 overflow-hidden">
            {activeStatuses.map(s => {
              const hx = statusColor(s.color);
              const SIcon = STATUS_ICONS[s.name] || CircleDashed;
              return (
                <button key={s.name} onClick={() => { onChange(s.name); setOpen(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted/5 transition-colors text-left ${value === s.name ? "text-foreground bg-muted/5" : "text-muted"}`}>
                  <SIcon size={11} style={{ color: hx }} />
                  <span className="flex-1 font-semibold text-[10px] tracking-wider uppercase">{s.name}</span>
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
function ApprovalScreen({ page, onApprove, onReject, apiPath }: { page: any; onApprove: () => void; onReject: () => void; apiPath?: string }) {
  const [loading, setLoading] = useState<null | "approve" | "reject">(null);
  const resolvedPath = apiPath ?? `/api/pages/${page._id}`;
  const act = async (type: "approve" | "reject") => {
    setLoading(type);
    if (type === "approve") {
      const r = await fetch(resolvedPath, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approval_status: "APPROVED" }) });
      if ((await r.json()).success) onApprove();
    } else {
      const r = await fetch(resolvedPath, { method: "DELETE" });
      if ((await r.json()).success) onReject();
    }
    setLoading(null);
  };
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center"><Lock size={24} className="text-amber-500" /></div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold text-foreground">"{page.name}" is Pending</h2>
        <p className="text-sm text-muted max-w-xs">{apiPath?.includes("boards") ? "Review and approve this workspace to allow the team to create projects and tasks." : "Review and approve this project to allow the team to add tasks."}</p>
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

// ─── List Row (ClickUp-style) ─────────────────────────────────────────────────
function ListRow({
  task, depth, activeStatuses, users, onOpen, onUpdate, allTasks, onExpand, expanded,
  addingSubtaskFor, setAddingSubtaskFor, handleCreateTask, isCreating, newTaskTitle, setNewTaskTitle, onDelete, currentUserId
}: {
  task: any; depth: number; activeStatuses: any[]; users: any[];
  onOpen: (id: string) => void; onUpdate: (t: any) => void;
  allTasks: any[]; onExpand: (id: string) => void; expanded: Set<string>;
  addingSubtaskFor: string | null; setAddingSubtaskFor: (id: string | null) => void;
  handleCreateTask: (e: React.FormEvent, statusOverride?: string, parentId?: string) => Promise<void>;
  isCreating: boolean; newTaskTitle: string; setNewTaskTitle: (v: string) => void;
  onDelete: (id: string) => void; currentUserId: string | null;
}) {
  const subtaskCount = allTasks.filter(t => String(t.parent_task_id) === String(task._id)).length;
  const isExpanded = expanded.has(String(task._id));
  const tStatus = activeStatuses.find(s => s.name === task.status);
  const hex = tStatus ? statusColor(tStatus.color) : "#6b7280";

  const patchTask = async (updates: any) => {
    const res = await fetch(`/api/tasks/${task._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
    const json = await res.json();
    if (json.success) onUpdate(json.data);
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center border-b border-muted/15 hover:bg-muted/5 transition-colors group cursor-pointer"
        style={{
          paddingLeft: depth * 20 + (depth > 0 ? 8 : 0),
          borderLeft: `2.5px solid ${depth === 0 ? hex : "transparent"}`,
        }}
        onClick={() => onOpen(String(task._id))}
      >
        {/* Expand toggle */}
        <button
          className={`shrink-0 w-6 h-8 flex items-center justify-center text-muted/25 hover:text-muted/60 transition-colors ${subtaskCount === 0 ? "invisible" : ""}`}
          onClick={e => { e.stopPropagation(); onExpand(String(task._id)); }}
        >
          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.12 }}>
            <ChevronRight size={10} />
          </motion.div>
        </button>

        {/* Status dot */}
        <div onClick={e => e.stopPropagation()} className="shrink-0 mr-2">
          <StatusPicker value={task.status} activeStatuses={activeStatuses} onChange={s => patchTask({ status: s })} />
        </div>

        {/* Title */}
        <span className="flex-1 text-[13px] font-medium text-foreground/80 group-hover:text-foreground transition-colors flex items-center gap-1.5 min-w-0 py-2.5 pr-1 truncate">
          <span className="truncate">{task.title}</span>
          <span className="flex items-center opacity-0 group-hover:opacity-100 transition-all gap-0.5 shrink-0">
            <button
              onClick={e => { e.stopPropagation(); setAddingSubtaskFor(String(task._id)); onExpand(String(task._id)); }}
              className="p-1 hover:bg-muted/10 rounded text-muted/40 hover:text-muted transition-colors"
              title="Add subtask"
            >
              <Plus size={10} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); if (confirm(`Delete "${task.title}"?`)) onDelete(String(task._id)); }}
              className="p-1 hover:bg-red-500/8 rounded text-muted/40 hover:text-red-500 transition-colors"
              title="Delete"
            >
              <Trash2 size={10} />
            </button>
          </span>
        </span>

        {/* Subtask badge */}
        {subtaskCount > 0 && (
          <div className="flex items-center gap-0.5 text-[9px] text-muted/50 shrink-0 px-1.5 py-0.5 rounded-full bg-muted/8 border border-muted/10 mr-1">
            <GitMerge size={8} />{subtaskCount}
          </div>
        )}

        {/* Assignees */}
        <div className="shrink-0 w-[72px] flex justify-center" onClick={e => e.stopPropagation()}>
          <AssigneePicker assignees={task.assignee_ids || []} users={users} onChange={ids => patchTask({ assignee_ids: ids })} />
        </div>

        {/* Due date */}
        <div className="shrink-0 w-24 flex justify-center" onClick={e => e.stopPropagation()}>
          <DatePicker value={task.due_date || null} onChange={d => patchTask({ due_date: d })} />
        </div>

        {/* Priority */}
        <div className="shrink-0 w-10 hidden sm:flex justify-center py-2" onClick={e => e.stopPropagation()}>
          <PriorityPicker value={task.priority || "NORMAL"} onChange={p => patchTask({ priority: p })} />
        </div>
      </motion.div>

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
              addingSubtaskFor={addingSubtaskFor}
              setAddingSubtaskFor={setAddingSubtaskFor}
              handleCreateTask={handleCreateTask}
              isCreating={isCreating}
              newTaskTitle={newTaskTitle}
              setNewTaskTitle={setNewTaskTitle}
              onDelete={onDelete}
              currentUserId={currentUserId}
            />
          ))
        }
        {isExpanded && addingSubtaskFor === String(task._id) && (
          <div
            className="flex items-center gap-2 py-2 border-b border-muted/15 bg-muted/5"
            style={{ paddingLeft: (depth + 1) * 20 + 20 }}
          >
            <div className="w-4 h-4 rounded-full border-2 border-muted/40 shrink-0" />
            <form onSubmit={e => handleCreateTask(e, task.status, String(task._id))} className="flex items-center gap-2 flex-1">
              <input
                autoFocus
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="Subtask name…"
                className="flex-1 text-[13px] bg-transparent text-foreground placeholder:text-muted/60 focus:outline-none font-medium"
              />
              <button type="button" onClick={() => { setAddingSubtaskFor(null); setNewTaskTitle(""); }} className="p-1 rounded hover:bg-muted/10 text-muted/70"><X size={11} /></button>
              <button disabled={isCreating || !newTaskTitle.trim()} className="px-2.5 py-1 bg-foreground text-background text-[11px] font-bold rounded-lg hover:opacity-90 disabled:opacity-30 transition-all">Save</button>
            </form>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Grouped List View (ClickUp-style) ───────────────────────────────────────
function GroupedListView({
  tasks, activeStatuses, users, onOpen, onTaskUpdated,
  addingSubtaskFor, setAddingSubtaskFor, handleCreateTask, isCreating, newTaskTitle, setNewTaskTitle,
  addingForStatus, setAddingForStatus, onDelete, currentUserId
}: {
  tasks: any[]; activeStatuses: any[]; users: any[];
  onOpen: (id: string) => void; onTaskUpdated: (t: any) => void;
  addingSubtaskFor: string | null; setAddingSubtaskFor: (id: string | null) => void;
  handleCreateTask: (e: React.FormEvent, statusOverride?: string, parentId?: string) => Promise<void>;
  isCreating: boolean; newTaskTitle: string; setNewTaskTitle: (v: string) => void;
  addingForStatus: string | null; setAddingForStatus: (status: string | null) => void;
  onDelete: (id: string) => void; currentUserId: string | null;
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleGroup = (s: string) =>
    setCollapsedGroups(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
  const toggleExpand = (id: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const rootTasks = tasks.filter(t => !t.parent_task_id);

  return (
    <div className="space-y-2 max-w-full">
      {activeStatuses.map((col: any) => {
        const hex = statusColor(col.color);
        const Icon = STATUS_ICONS[col.name] || CircleDashed;
        const colTasks = rootTasks.filter(t => (t.status || "TODO") === col.name);
        const isCollapsed = collapsedGroups.has(col.name);
        return (
          <div key={col.name} className="rounded-xl overflow-hidden border border-muted/15 bg-surface/50">
            {/* Group header */}
            <div
              className="flex items-center gap-2 px-3 py-2 border-b border-muted/15 hover:bg-muted/5 transition-colors"
              style={{ borderLeft: `3px solid ${hex}` }}
            >
              <button onClick={() => toggleGroup(col.name)} className="flex items-center gap-2 flex-1 min-w-0">
                <motion.div animate={{ rotate: isCollapsed ? -90 : 0 }} transition={{ duration: 0.15 }}>
                  <ChevronDown size={12} className="text-muted/60 shrink-0" />
                </motion.div>
                <div
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase"
                  style={{ backgroundColor: `${hex}18`, color: hex, border: `1px solid ${hex}30` }}
                >
                  <Icon size={9} />
                  {col.name}
                </div>
                <span className="text-[10px] text-muted/60 font-semibold bg-muted/10 px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
              </button>
            </div>

            {!isCollapsed && (
              <>
                {/* Column headers */}
                <div className="flex items-center px-3 py-1.5 border-b border-muted/15 text-[9px] font-bold uppercase tracking-widest text-muted/60">
                  <div className="w-6 shrink-0" />
                  <div className="w-4 shrink-0" />
                  <div className="flex-1 pl-2">Name</div>
                  <div className="w-[72px] text-center shrink-0">Assignee</div>
                  <div className="w-24 text-center shrink-0">Due Date</div>
                  <div className="w-10 text-center shrink-0 hidden sm:block">Pri</div>
                </div>

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
                    addingSubtaskFor={addingSubtaskFor}
                    setAddingSubtaskFor={setAddingSubtaskFor}
                    handleCreateTask={handleCreateTask}
                    isCreating={isCreating}
                    newTaskTitle={newTaskTitle}
                    setNewTaskTitle={setNewTaskTitle}
                    onDelete={onDelete}
                    currentUserId={currentUserId}
                  />
                ))}

                {addingForStatus === col.name ? (
                  <div className="flex items-center gap-2 px-8 py-2 border-t border-muted/15 bg-muted/5">
                    <div className="w-4 h-4 rounded-full border-2 border-muted/40 shrink-0" />
                    <form onSubmit={e => handleCreateTask(e, col.name)} className="flex items-center gap-2 flex-1">
                      <input
                        autoFocus
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        placeholder="Task name…"
                        className="flex-1 text-[13px] bg-transparent text-foreground placeholder:text-muted/60 focus:outline-none font-medium"
                      />
                      <button type="button" onClick={() => { setAddingForStatus(null); setNewTaskTitle(""); }} className="p-1 rounded hover:bg-muted/10 text-muted/70"><X size={11} /></button>
                      <button disabled={isCreating || !newTaskTitle.trim()} className="px-2.5 py-1 bg-foreground text-background text-[11px] font-bold rounded-lg hover:opacity-90 disabled:opacity-30 transition-all">Save</button>
                    </form>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingForStatus(col.name)}
                    className="flex items-center gap-2 px-8 py-2.5 text-[12px] text-muted/60 hover:text-muted/80 hover:bg-muted/5 transition-colors w-full group/add border-t border-muted/15"
                  >
                    <Plus size={11} className="group-hover/add:text-foreground/60 transition-colors" />
                    Add task
                  </button>
                )}
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
  const currentUserId = (session?.user as any)?.id || null;

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"KANBAN" | "LIST">("LIST");

  // ── Drag-and-drop state (Kanban) ─────────────────────────────────────────────
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const dragCounterRef = useRef<Record<string, number>>({});

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
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null);

  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardMembers, setNewBoardMembers] = useState<string[]>([]);
  const [isRequestPageOpen, setIsRequestPageOpen] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageDesc, setNewPageDesc] = useState("");

  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editBoardName, setEditBoardName] = useState("");
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [manageMembersBoardId, setManageMembersBoardId] = useState<string | null>(null);
  const [deleteBoardTarget, setDeleteBoardTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingBoard, setIsDeletingBoard] = useState(false);

  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editPageName, setEditPageName] = useState("");
  // Ref keeps the committed editing context for onBlur — avoids React state timing races
  const editingPageRef = useRef<{ id: string; name: string } | null>(null);
  const editingBoardRef = useRef<{ id: string; name: string } | null>(null);

  const [isManageStatusesOpen, setIsManageStatusesOpen] = useState(false);
  const [manageStatusesBoardId, setManageStatusesBoardId] = useState<string | null>(null);
  const [editingStatuses, setEditingStatuses] = useState<{ name: string; color: string; order: number }[]>([]);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#6b7280");

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
    if (json.success && Array.isArray(json.data)) setUsers(json.data);
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
    const res = await fetch("/api/boards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newBoardName.trim(), members: newBoardMembers }) });
    const json = await res.json();
    if (json.success) { setBoards(prev => [...prev, json.data]); setSelectedBoardId(json.data._id); setExpandedBoards(prev => new Set([...prev, json.data._id])); setNewBoardName(""); setNewBoardMembers([]); setIsCreateBoardOpen(false); }
  };

  const handleUpdateBoard = async (id: string, updates: any) => {
    // Close rename input immediately — same pattern as page renaming
    if (updates.name !== undefined) {
      setEditingBoardId(null);
      setEditBoardName("");
      editingBoardRef.current = null;
      if (!updates.name.trim()) return; // Don't save empty names
    }
    const res = await fetch(`/api/boards/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
    const json = await res.json();
    if (json.success) {
      setBoards(prev => prev.map(b => b._id === id ? { ...b, ...updates, ...(json.data || {}) } : b));
      setIsManageMembersOpen(false);
      setManageMembersBoardId(null);
      setIsManageStatusesOpen(false);
      setManageStatusesBoardId(null);
    }
  };

  const handleSaveStatuses = () => {
    if (!manageStatusesBoardId) return;
    const ordered = editingStatuses.map((s, i) => ({ ...s, order: i }));
    handleUpdateBoard(manageStatusesBoardId, { statuses: ordered });
  };

  const handleUpdatePage = async (id: string, name: string) => {
    // Always close the input immediately — no async wait
    setEditingPageId(null);
    setEditPageName("");
    editingPageRef.current = null;
    if (!name.trim()) return;
    const res = await fetch(`/api/pages/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
    const json = await res.json();
    if (json.success) {
      setPages(prev => prev.map(p => p._id === id ? { ...p, name: name.trim() } : p));
      setSelectedPage((prev: any) => prev?._id === id ? { ...prev, name: name.trim() } : prev);
    }
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

  const handleApproveBoard = () => {
    if (!selectedBoardId) return;
    setBoards(prev => prev.map(b => b._id === selectedBoardId ? { ...b, approval_status: "APPROVED" } : b));
    handleUpdateBoard(selectedBoardId, { approval_status: "APPROVED" });
  };
  const handleRejectBoard = async () => {
    if (!selectedBoardId) return;
    await fetch(`/api/boards/${selectedBoardId}`, { method: "DELETE" });
    const remaining = boards.filter(b => b._id !== selectedBoardId);
    setBoards(remaining);
    setSelectedBoardId(remaining.length > 0 ? remaining[0]._id : null);
  };

  const handleDeleteBoard = async () => {
    if (!deleteBoardTarget) return;
    setIsDeletingBoard(true);
    await fetch(`/api/boards/${deleteBoardTarget.id}`, { method: "DELETE" });
    const remaining = boards.filter(b => b._id !== deleteBoardTarget.id);
    setBoards(remaining);
    if (selectedBoardId === deleteBoardTarget.id) {
      setSelectedBoardId(remaining.length > 0 ? remaining[0]._id : null);
    }
    setDeleteBoardTarget(null);
    setIsDeletingBoard(false);
  };

  const handleCreateTask = async (e: React.FormEvent, statusOverride?: string, parentId?: string) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedBoardId || !selectedPageId) return;
    setIsCreating(true);
    const board = boards.find(b => b._id === selectedBoardId);
    const status = statusOverride || board?.statuses?.[0]?.name || "TODO";
    
    const body: any = { title: newTaskTitle, board_id: selectedBoardId, page_id: selectedPageId, status };
    if (parentId) body.parent_task_id = parentId;

    const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    if (json.success) { setTasks(prev => [json.data, ...prev]); setNewTaskTitle(""); setAddingForStatus(null); setAddingSubtaskFor(null); }
    setIsCreating(false);
  };

  const handleTaskUpdated = (updatedTask: any) => {
    if (updatedTask.deleted) setTasks(prev => prev.filter(t => String(t._id) !== String(updatedTask._id)));
    else setTasks(prev => prev.map(t => String(t._id) === String(updatedTask._id) ? updatedTask : t));
  };

  const handleDeleteTask = async (id: string) => {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) setTasks(prev => prev.filter(t => String(t._id) !== id && String(t.parent_task_id) !== id));
  };

  // ── Kanban DnD handlers ───────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverColumn(null);
    dragCounterRef.current = {};
  };

  const handleColumnDragEnter = (e: React.DragEvent, colName: string) => {
    e.preventDefault();
    dragCounterRef.current[colName] = (dragCounterRef.current[colName] || 0) + 1;
    setDragOverColumn(colName);
  };

  const handleColumnDragLeave = (e: React.DragEvent, colName: string) => {
    dragCounterRef.current[colName] = (dragCounterRef.current[colName] || 1) - 1;
    if (dragCounterRef.current[colName] <= 0) {
      dragCounterRef.current[colName] = 0;
      setDragOverColumn(prev => prev === colName ? null : prev);
    }
  };

  const handleColumnDrop = async (e: React.DragEvent, colName: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    dragCounterRef.current = {};
    setDragOverColumn(null);
    setDraggingTaskId(null);
    if (!taskId) return;
    const task = tasks.find(t => String(t._id) === taskId);
    if (!task || task.status === colName) return;
    // Optimistic update
    setTasks(prev => prev.map(t => String(t._id) === taskId ? { ...t, status: colName } : t));
    // Persist
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: colName }),
    });
    const json = await res.json();
    if (!json.success) {
      // Roll back
      setTasks(prev => prev.map(t => String(t._id) === taskId ? { ...t, status: task.status } : t));
    }
  };

  const activeStatuses = boards.find(b => b._id === selectedBoardId)?.statuses || [];
  const filteredTasks = tasks.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()));
  const isPendingPage = selectedPage?.approval_status === "PENDING";
  const pendingCount = pages.filter(p => p.approval_status === "PENDING").length;

  // ─── Sidebar content ──────────────────────────────────────────────────────────
  const sidebarContent = (
    <>
      <div className="px-4 py-3 border-b border-muted/10 flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted/60">Workspaces</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsCreateBoardOpen(true)} className="p-1 rounded-lg hover:bg-muted/10 text-muted/50 hover:text-foreground transition-colors" title={isAdmin ? "New Workspace" : "Request Workspace"}>
            <Plus size={13} />
          </button>
          <button className="sm:hidden p-1 rounded-lg hover:bg-muted/10 text-muted" onClick={() => setSidebarOpen(false)}>
            <X size={14} />
          </button>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 no-scrollbar">
        {boards.map(board => {
          const isExpanded = expandedBoards.has(board._id);
          const isActiveBrd = selectedBoardId === board._id;
          const isPendingBoard = board.approval_status === "PENDING";
          const canClickBoard = isAdmin || !isPendingBoard;
          return (
            <div key={board._id}>
              <div className={`group/board flex items-center gap-0.5 rounded-xl transition-all ${isActiveBrd ? "bg-cyan/10" : isPendingBoard ? "" : "hover:bg-muted/5"}`}>
                {/* Chevron toggle */}
                <button
                  onClick={() => { if (canClickBoard && !isPendingBoard) { setSelectedBoardId(board._id); setExpandedBoards(prev => { const n = new Set(prev); isExpanded ? n.delete(board._id) : n.add(board._id); return n; }); } else if (isAdmin && isPendingBoard) { setSelectedBoardId(board._id); } }}
                  className={`p-2 rounded-xl shrink-0 transition-colors ${isActiveBrd ? "text-cyan" : "text-muted hover:text-foreground"} ${isPendingBoard ? "opacity-50" : ""}`}
                >
                  <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.15 }}><ChevronRight size={11} /></motion.div>
                </button>

                {/* Board name — button when viewing, div+input when editing */}
                {editingBoardId === board._id ? (
                  <div className="flex-1 flex items-center gap-1.5 min-w-0 py-1.5">
                    <Layers size={11} className="shrink-0 text-cyan" />
                    <input
                      autoFocus
                      value={editBoardName}
                      onChange={e => { setEditBoardName(e.target.value); if (editingBoardRef.current) editingBoardRef.current.name = e.target.value; }}
                      onBlur={() => {
                        const ref = editingBoardRef.current;
                        if (ref && ref.name.trim() && ref.name !== board.name) {
                          handleUpdateBoard(ref.id, { name: ref.name.trim() });
                        } else {
                          setEditingBoardId(null);
                          setEditBoardName("");
                          editingBoardRef.current = null;
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === "Enter") { if (editingBoardRef.current) handleUpdateBoard(editingBoardRef.current.id, { name: editingBoardRef.current.name.trim() }); }
                        if (e.key === "Escape") { setEditingBoardId(null); setEditBoardName(""); editingBoardRef.current = null; }
                      }}
                      className="flex-1 min-w-0 bg-background border border-cyan/40 rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => { if (canClickBoard && !isPendingBoard) { setSelectedBoardId(board._id); setExpandedBoards(prev => { const n = new Set(prev); isExpanded ? n.delete(board._id) : n.add(board._id); return n; }); } else if (isAdmin && isPendingBoard) { setSelectedBoardId(board._id); } }}
                    className={`flex-1 flex items-center gap-1.5 min-w-0 py-2 text-xs transition-colors ${isActiveBrd ? "text-cyan font-semibold" : isPendingBoard ? "text-amber-500/70 cursor-not-allowed" : "text-muted hover:text-foreground font-semibold"} ${(!canClickBoard && !isAdmin) ? "pointer-events-none" : ""}`}
                  >
                    <Layers size={11} className="shrink-0" />
                    <span className="truncate text-left flex-1">{board.name}</span>
                    {isAdmin && pendingCount > 0 && isActiveBrd && !isPendingBoard && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20 font-bold animate-pulse shrink-0">{pendingCount}</span>
                    )}
                    {isPendingBoard && isAdmin && <span className="text-[8px] px-1 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20 font-bold animate-pulse shrink-0">Review</span>}
                    {isPendingBoard && !isAdmin && <Lock size={10} className="text-amber-500/60 animate-pulse shrink-0 mr-2" />}
                  </button>
                )}

                {/* Admin action icons */}
                {isAdmin && editingBoardId !== board._id && (
                  <div className="flex items-center gap-0.5 pr-1 opacity-0 group-hover/board:opacity-100 transition-all shrink-0">
                    <button onClick={e => { e.stopPropagation(); editingBoardRef.current = { id: board._id, name: board.name }; setEditingBoardId(board._id); setEditBoardName(board.name); }} className="p-1 rounded-md text-muted hover:text-foreground transition-colors" title="Rename"><Pencil size={10} /></button>
                    <button onClick={e => { e.stopPropagation(); setIsManageMembersOpen(true); setManageMembersBoardId(board._id); setNewBoardMembers(board.members?.map((m: any) => typeof m === "string" ? m : m._id) || []); }} className="p-1 rounded-md text-muted hover:text-cyan transition-colors" title="Members"><UserPlus size={10} /></button>
                    <button onClick={e => { e.stopPropagation(); setIsManageStatusesOpen(true); setManageStatusesBoardId(board._id); setEditingStatuses(board.statuses ? [...board.statuses].sort((a: any, b: any) => a.order - b.order) : []); setNewStatusName(""); setNewStatusColor("#6b7280"); }} className="p-1 rounded-md text-muted hover:text-violet transition-colors" title="Statuses"><Settings2 size={10} /></button>
                    <button onClick={e => { e.stopPropagation(); setDeleteBoardTarget({ id: board._id, name: board.name }); }} className="p-1 rounded-md text-muted hover:text-red-500 transition-colors" title="Delete Workspace"><Trash2 size={10} /></button>
                  </div>
                )}
              </div>
              <AnimatePresence>
                {isExpanded && isActiveBrd && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden ml-4 pl-2 border-l border-muted/10 mt-0.5 mb-0.5 space-y-0.5">
                    {pages.map(page => {
                      const isPending = page.approval_status === "PENDING";
                      const isActivePg = selectedPageId === page._id;
                      const canClick = isAdmin || !isPending;
                      const isEditingThis = editingPageId === page._id;
                      return (
                        <div key={page._id} className="relative group/page">
                          <div className={`flex items-center gap-0.5 rounded-lg transition-all ${isActivePg ? "bg-cyan/10" : isPending ? "" : "hover:bg-muted/5"}`}>
                            {isEditingThis ? (
                              <div className="flex-1 flex items-center gap-1.5 pl-2.5 pr-1 py-1">
                                <FileText size={11} className="shrink-0 text-cyan" />
                                <input
                                  autoFocus
                                  value={editPageName}
                                  onChange={e => { setEditPageName(e.target.value); if (editingPageRef.current) editingPageRef.current.name = e.target.value; }}
                                  onBlur={() => {
                                    const ref = editingPageRef.current;
                                    if (ref && ref.name.trim() && ref.name !== page.name) {
                                      handleUpdatePage(ref.id, ref.name);
                                    } else {
                                      setEditingPageId(null);
                                      setEditPageName("");
                                      editingPageRef.current = null;
                                    }
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === "Enter") { if (editingPageRef.current) handleUpdatePage(editingPageRef.current.id, editingPageRef.current.name); }
                                    if (e.key === "Escape") { setEditingPageId(null); setEditPageName(""); editingPageRef.current = null; }
                                  }}
                                  className="flex-1 min-w-0 bg-background border border-cyan/40 rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none"
                                />
                              </div>
                            ) : (
                              <button
                                onClick={() => canClick && handleSelectPage(page)}
                                className={`flex-1 flex items-center gap-2 pl-2.5 pr-1 py-1.5 text-xs transition-colors min-w-0 ${isActivePg ? "text-cyan font-semibold" : isPending ? "text-amber-500/70 cursor-not-allowed" : "text-muted hover:text-foreground"} ${!canClick ? "pointer-events-none" : ""}`}
                              >
                                <FileText size={11} className="shrink-0" />
                                <span className="flex-1 text-left truncate">{page.name}</span>
                                {isPending && isAdmin && <span className="text-[8px] px-1 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20 font-bold animate-pulse shrink-0">Review</span>}
                                {isPending && !isAdmin && <Lock size={10} className="text-amber-500/60 animate-pulse shrink-0" />}
                              </button>
                            )}
                            {canClick && !isPending && !isEditingThis && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  editingPageRef.current = { id: page._id, name: page.name };
                                  setEditingPageId(page._id);
                                  setEditPageName(page.name);
                                }}
                                className="p-1 mr-1 rounded-md text-muted hover:text-foreground opacity-0 group-hover/page:opacity-100 transition-all shrink-0"
                                title="Rename project"
                              >
                                <Pencil size={10} />
                              </button>
                            )}
                          </div>
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
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden sm:flex w-52 lg:w-60 shrink-0 flex-col border-r border-muted/10 bg-surface overflow-hidden">
        {sidebarContent}
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
                  <span className="text-muted hidden sm:inline truncate max-w-[80px]">
                    {boards.find(b => b._id === selectedBoardId)?.name}
                  </span>
                  <ChevronRight size={11} className="text-muted/40 hidden sm:inline shrink-0" />
                  <span className="truncate max-w-[120px] sm:max-w-none" onDoubleClick={() => { if (isAdmin || !isPendingPage) { setEditingPageId(selectedPage._id); setEditPageName(selectedPage.name); } }} title="Double click to rename">
                    {editingPageId === selectedPage._id ? (
                      <input autoFocus value={editPageName} onChange={e => setEditPageName(e.target.value)} onBlur={() => handleUpdatePage(selectedPage._id, editPageName)} onKeyDown={e => { if (e.key === "Enter") handleUpdatePage(selectedPage._id, editPageName); if (e.key === "Escape") setEditingPageId(null); }} className="bg-transparent border-b border-cyan/40 text-foreground focus:outline-none w-[120px]" />
                    ) : selectedPage.name}
                  </span>
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
          {(() => { const selectedBoard = boards.find(b => b._id === selectedBoardId); return selectedBoard?.approval_status === "PENDING" ? (
            isAdmin ? <ApprovalScreen page={selectedBoard} apiPath={`/api/boards/${selectedBoard._id}`} onApprove={handleApproveBoard} onReject={handleRejectBoard} />
              : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center gap-3 text-muted p-8">
                  <Lock size={32} className="text-amber-500/40" />
                  <p className="text-sm font-semibold text-amber-500">Workspace is awaiting admin approval.</p>
                </motion.div>
              )
          ) : isPendingPage ? (
            isAdmin ? <ApprovalScreen page={selectedPage} apiPath={`/api/pages/${selectedPage?._id}`} onApprove={handleApproveProject} onReject={handleRejectProject} />
              : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center gap-3 text-muted p-8">
                  <Lock size={32} className="text-amber-500/40" />
                  <p className="text-sm font-semibold text-amber-500">Awaiting admin approval.</p>
                </motion.div>
              )
          ) : null; })() || (
            <>
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
                    addingSubtaskFor={addingSubtaskFor}
                    setAddingSubtaskFor={setAddingSubtaskFor}
                    handleCreateTask={handleCreateTask}
                    isCreating={isCreating}
                    newTaskTitle={newTaskTitle}
                    setNewTaskTitle={setNewTaskTitle}
                    addingForStatus={addingForStatus}
                    setAddingForStatus={setAddingForStatus}
                    onDelete={handleDeleteTask}
                    currentUserId={currentUserId}
                  />
                ) : (
                  // Kanban — drag-and-drop
                  <div className="flex gap-4 h-full pb-4" style={{ minWidth: `${activeStatuses.length * 288}px` }}>
                    {activeStatuses.map((col: any) => {
                      const Icon = STATUS_ICONS[col.name] || CircleDashed;
                      const hex = statusColor(col.color);
                      const colTasks = filteredTasks.filter(t => !t.parent_task_id && (t.status || "TODO") === col.name);
                      const isOver = dragOverColumn === col.name;
                      const isDraggingFromHere = draggingTaskId && colTasks.some(t => String(t._id) === draggingTaskId);
                      return (
                        <div
                          key={col.name}
                          className={`flex flex-col shrink-0 rounded-2xl border transition-all overflow-hidden ${
                            isOver
                              ? "border-2 shadow-lg scale-[1.005]"
                              : "border-muted/10"
                          } bg-surface/60`}
                          style={{
                            width: "280px",
                            borderColor: isOver ? hex : undefined,
                            boxShadow: isOver ? `0 0 0 2px ${hex}30, 0 8px 32px ${hex}18` : undefined,
                          }}
                          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                          onDragEnter={e => handleColumnDragEnter(e, col.name)}
                          onDragLeave={e => handleColumnDragLeave(e, col.name)}
                          onDrop={e => handleColumnDrop(e, col.name)}
                        >
                          {/* Column header */}
                          <div
                            className="px-4 py-3 flex items-center justify-between border-b transition-colors"
                            style={{ borderColor: isOver ? `${hex}30` : undefined }}
                          >
                            <div className="flex items-center gap-2">
                              <Icon size={13} style={{ color: hex }} />
                              <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: hex }}>{col.name}</span>
                            </div>
                            <span className="text-[10px] text-muted font-bold bg-muted/10 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                          </div>

                          {/* Drop hint */}
                          {isOver && !isDraggingFromHere && (
                            <div
                              className="mx-2.5 mt-2.5 rounded-xl border-2 border-dashed py-4 flex items-center justify-center text-[11px] font-semibold"
                              style={{ borderColor: `${hex}50`, color: hex, backgroundColor: `${hex}08` }}
                            >
                              Drop here → {col.name}
                            </div>
                          )}

                          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 no-scrollbar">
                            <AnimatePresence>
                              {colTasks.map(t => {
                                const isDragging = String(t._id) === draggingTaskId;
                                const subtaskCount = tasks.filter(st => String(st.parent_task_id) === String(t._id)).length;
                                const priorityColors: Record<string, string> = { URGENT: "#ef4444", HIGH: "#f59e0b", NORMAL: "#6366f1", LOW: "#94a3b8" };
                                const pColor = priorityColors[t.priority || "NORMAL"];
                                const isOverdue = t.due_date && new Date(t.due_date) < new Date();
                                return (
                                  <motion.div
                                    key={String(t._id)}
                                    layout
                                    layoutId={String(t._id)}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: isDragging ? 0.4 : 1, y: 0, scale: isDragging ? 0.97 : 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={spring}
                                  >
                                    <div
                                      draggable
                                      onDragStart={(ev: React.DragEvent<HTMLDivElement>) => handleDragStart(ev, String(t._id))}
                                      onDragEnd={handleDragEnd}
                                      onClick={() => !isDragging && setSelectedTaskId(String(t._id))}
                                      className={`rounded-xl cursor-grab active:cursor-grabbing transition-all group select-none overflow-hidden border ${isDragging ? "border-muted/5 opacity-50" : "border-muted/10 bg-surface hover:border-muted/20 hover:shadow-md"}`}
                                    >
                                      {/* Colored top accent bar */}
                                      <div className="h-0.5 w-full" style={{ backgroundColor: hex, opacity: 0.7 }} />

                                      <div className="p-3">
                                        {/* Title row */}
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                          <h4 className="text-[13px] font-medium text-foreground/80 group-hover:text-foreground transition-colors leading-snug flex-1">{t.title}</h4>
                                          <GripVertical size={11} className="text-muted/15 group-hover:text-muted/35 transition-colors shrink-0 mt-0.5" />
                                        </div>

                                        {/* Tags / badges row */}
                                        <div className="flex flex-wrap items-center gap-1 mb-3">
                                          {t.priority && t.priority !== "NORMAL" && (
                                            <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ color: pColor, backgroundColor: `${pColor}15` }}>
                                              <Flag size={7} />{t.priority}
                                            </span>
                                          )}
                                          {subtaskCount > 0 && (
                                            <span className="flex items-center gap-0.5 text-[9px] text-muted/50 bg-muted/8 px-1.5 py-0.5 rounded-md border border-muted/10 font-semibold">
                                              <GitMerge size={7} /> {subtaskCount}
                                            </span>
                                          )}
                                          {t.due_date && (
                                            <span className={`flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${isOverdue ? "text-red-500 bg-red-500/10" : "text-muted/50 bg-muted/8"}`}>
                                              <Clock size={7} />{new Date(t.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                            </span>
                                          )}
                                        </div>

                                        {/* Bottom row: assignees */}
                                        <div className="flex items-center justify-between">
                                          <div className="flex -space-x-1">
                                            {t.assignee_ids?.slice(0, 3).map((a: any, i: number) => (
                                              <div key={i} title={a.name} className="w-5 h-5 rounded-full border-2 border-surface bg-gradient-to-br from-violet/40 to-cyan/30 flex items-center justify-center text-[7px] font-bold text-white overflow-hidden">
                                                {a.avatar ? <img src={a.avatar} alt="" className="w-full h-full object-cover" /> : a.name?.[0]}
                                              </div>
                                            ))}
                                            {!t.assignee_ids?.length && (
                                              <div className="w-5 h-5 rounded-full border border-dashed border-muted/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <UserPlus size={8} className="text-muted/30" />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>

                            {/* Add task quick-create */}
                            {addingForStatus === col.name ? (
                              <div className="p-2">
                                <form onSubmit={e => handleCreateTask(e, col.name)} className="flex items-center gap-2">
                                  <input
                                    autoFocus
                                    value={newTaskTitle}
                                    onChange={e => setNewTaskTitle(e.target.value)}
                                    placeholder="Task name…"
                                    className="flex-1 text-xs bg-muted/5 border border-muted/15 rounded-xl px-3 py-2 text-foreground placeholder:text-muted/40 focus:outline-none focus:border-cyan/40"
                                  />
                                  <button type="button" onClick={() => { setAddingForStatus(null); setNewTaskTitle(""); }} className="p-1.5 rounded hover:bg-muted/10 text-muted"><X size={11} /></button>
                                  <button disabled={isCreating || !newTaskTitle.trim()} className="p-1.5 btn-primary rounded-lg disabled:opacity-40"><Plus size={11} /></button>
                                </form>
                              </div>
                            ) : (
                              <button
                                onClick={() => setAddingForStatus(col.name)}
                                className="w-full flex items-center gap-1.5 px-3 py-2 text-[11px] text-muted/60 hover:text-muted/80 hover:bg-muted/10 rounded-xl transition-colors"
                              >
                                <Plus size={11} /><span>Add task</span>
                              </button>
                            )}
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
              <div className="flex items-center gap-3 mb-5"><div className="w-8 h-8 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center"><Layers size={14} className="text-cyan" /></div><h3 className="text-base font-bold text-foreground">{isAdmin ? "New Workspace" : "Request Workspace"}</h3></div>
              <form onSubmit={handleCreateBoard} className="space-y-4">
                <input autoFocus value={newBoardName} onChange={e => setNewBoardName(e.target.value)} placeholder="Workspace name…" className="w-full bg-muted/5 border border-muted/15 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-cyan/40" />
                
                {isAdmin && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-muted/60 tracking-wider">Members ({newBoardMembers.length})</span>
                  <div className="flex items-center gap-2 flex-wrap h-10 px-3 bg-muted/5 border border-muted/15 rounded-xl">
                    <AssigneePicker assignees={newBoardMembers.map(id => users.find(u => u._id === id) || id)} users={users} onChange={setNewBoardMembers} />
                    <span className="text-[10px] text-muted line-clamp-1 flex-1">{newBoardMembers.length > 0 ? "Users selected" : "Click to select members"}</span>
                  </div>
                </div>
                )}

                {!isAdmin && (
                  <p className="text-xs text-muted/60 bg-amber-500/5 border border-amber-500/15 rounded-xl px-3 py-2.5">Your request will be sent to the admin for approval before you can access this workspace.</p>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => setIsCreateBoardOpen(false)} className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors">Cancel</button>
                  <button type="submit" disabled={!newBoardName.trim()} className="btn-primary px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-40">{isAdmin ? "Create" : "Send Request"}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isManageMembersOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsManageMembersOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }} transition={spring} className="relative bg-surface border border-muted/15 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center gap-3 mb-5"><div className="w-8 h-8 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center"><UserPlus size={14} className="text-cyan" /></div><h3 className="text-base font-bold text-foreground">Manage Members</h3></div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-muted/60 tracking-wider">Members ({newBoardMembers.length})</span>
                  <div className="flex items-center gap-2 flex-wrap min-h-[40px] px-3 border border-muted/15 rounded-xl bg-muted/5">
                    <AssigneePicker assignees={newBoardMembers.map(id => users.find(u => u._id === id) || id)} users={users} onChange={setNewBoardMembers} />
                    <span className="text-[10px] text-muted ml-2">Add or remove users</span>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => setIsManageMembersOpen(false)} className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors">Cancel</button>
                  <button type="button" onClick={() => handleUpdateBoard(manageMembersBoardId!, { members: newBoardMembers })} className="btn-primary px-5 py-2 rounded-xl text-sm font-bold">Save</button>
                </div>
              </div>
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

      <AnimatePresence>
        {isManageStatusesOpen && (() => {
          const STATUS_COLORS = [
            { hex: "#6b7280", label: "Gray" },
            { hex: "#22d3ee", label: "Cyan" },
            { hex: "#a78bfa", label: "Violet" },
            { hex: "#f59e0b", label: "Amber" },
            { hex: "#4ade80", label: "Green" },
            { hex: "#f87171", label: "Red" },
            { hex: "#60a5fa", label: "Blue" },
            { hex: "#e879f9", label: "Pink" },
          ];
          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsManageStatusesOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }} transition={spring} className="relative bg-surface border border-muted/15 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-muted/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-violet/10 border border-violet/20 flex items-center justify-center"><Settings2 size={14} className="text-violet" /></div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Manage Statuses</h3>
                      <p className="text-[10px] text-muted mt-0.5">{boards.find(b => b._id === manageStatusesBoardId)?.name}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsManageStatusesOpen(false)} className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-muted/10 transition-all"><X size={15} /></button>
                </div>

                {/* Status List */}
                <div className="p-5 space-y-2 max-h-72 overflow-y-auto no-scrollbar">
                  {editingStatuses.length === 0 && (
                    <div className="text-center py-6 text-muted text-xs italic">No statuses yet. Add one below.</div>
                  )}
                  {editingStatuses.map((status, idx) => (
                    <motion.div key={idx} layout className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-muted/10 bg-muted/5 hover:border-muted/20 transition-all">
                      <GripVertical size={13} className="text-muted/30 cursor-grab shrink-0" />
                      <div className="w-3 h-3 rounded-full shrink-0 border border-white/20" style={{ backgroundColor: status.color }} />
                      <span className="flex-1 text-xs font-semibold text-foreground font-mono tracking-wide">{status.name}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* move up/down */}
                        <button disabled={idx === 0} onClick={() => setEditingStatuses(prev => { const a = [...prev]; [a[idx-1], a[idx]] = [a[idx], a[idx-1]]; return a; })} className="p-1 rounded text-muted hover:text-foreground disabled:opacity-20 transition-colors text-[9px]">↑</button>
                        <button disabled={idx === editingStatuses.length - 1} onClick={() => setEditingStatuses(prev => { const a = [...prev]; [a[idx], a[idx+1]] = [a[idx+1], a[idx]]; return a; })} className="p-1 rounded text-muted hover:text-foreground disabled:opacity-20 transition-colors text-[9px]">↓</button>
                        <button onClick={() => setEditingStatuses(prev => prev.filter((_, i) => i !== idx))} className="p-1 rounded text-muted hover:text-red-500 transition-colors"><Trash2 size={11} /></button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Add New Status */}
                <div className="px-5 pb-5 space-y-3 border-t border-muted/10 pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted/60">Add Status</p>
                  <div className="flex items-center gap-2">
                    <input
                      value={newStatusName}
                      onChange={e => setNewStatusName(e.target.value.toUpperCase())}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newStatusName.trim()) {
                          setEditingStatuses(prev => [...prev, { name: newStatusName.trim(), color: newStatusColor, order: prev.length }]);
                          setNewStatusName("");
                        }
                      }}
                      placeholder="STATUS_NAME"
                      className="flex-1 bg-muted/5 border border-muted/15 rounded-xl px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted/40 focus:outline-none focus:border-cyan/40"
                    />
                    <button
                      disabled={!newStatusName.trim()}
                      onClick={() => { if (!newStatusName.trim()) return; setEditingStatuses(prev => [...prev, { name: newStatusName.trim(), color: newStatusColor, order: prev.length }]); setNewStatusName(""); }}
                      className="px-3 py-2 rounded-xl bg-cyan/10 border border-cyan/20 text-cyan text-xs font-bold hover:bg-cyan/15 disabled:opacity-40 transition-all"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  {/* Color picker */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {STATUS_COLORS.map(c => (
                      <button
                        key={c.hex}
                        onClick={() => setNewStatusColor(c.hex)}
                        title={c.label}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${newStatusColor === c.hex ? "border-white scale-125" : "border-transparent opacity-60 hover:opacity-100"}`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                    <span className="text-[9px] text-muted ml-1">pick color</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-2 justify-end px-5 pb-5">
                  <button onClick={() => setIsManageStatusesOpen(false)} className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors">Cancel</button>
                  <button onClick={handleSaveStatuses} className="btn-primary px-5 py-2 rounded-xl text-sm font-bold">Save Statuses</button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ── Delete Board Confirmation Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {deleteBoardTarget && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isDeletingBoard && setDeleteBoardTarget(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.94, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 8 }} transition={spring} className="relative bg-surface border border-red-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              {/* Icon */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <Trash2 size={18} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Delete Workspace</h3>
                  <p className="text-xs text-muted/70">This action cannot be undone</p>
                </div>
              </div>

              {/* Warning body */}
              <div className="bg-red-500/5 border border-red-500/15 rounded-xl px-4 py-3 mb-5 space-y-1">
                <p className="text-sm text-foreground font-medium">
                  You are about to permanently delete:
                </p>
                <p className="text-sm font-bold text-red-400">"{deleteBoardTarget.name}"</p>
                <p className="text-xs text-muted/70 pt-1">
                  All projects and tasks inside this workspace will be <span className="text-red-400 font-semibold">permanently deleted</span> and cannot be recovered.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDeleteBoardTarget(null)}
                  disabled={isDeletingBoard}
                  className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteBoard}
                  disabled={isDeletingBoard}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all disabled:opacity-60"
                >
                  {isDeletingBoard ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {isDeletingBoard ? "Deleting…" : "Yes, Delete"}
                </button>
              </div>
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
