"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Clock, MessageSquare, UserPlus, FileText, Send,
  Loader2, GitMerge, ChevronRight, Trash2, Plus,
  CheckCircle2, CircleDashed, Eye, Flag, Calendar
} from "lucide-react";

// ─── Inline Loaders ─────────────────────────────────────────────────────────

const STATUS_ICONS: Record<string, any> = {
  DONE: CheckCircle2, IN_PROGRESS: Clock, REVIEW: Eye, TODO: CircleDashed,
};

function AssigneePicker({ assignees, users, onChange }: { assignees: any[]; users: any[]; onChange: (ids: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const toggle = (uid: string) => { const ids = assignees.map((a: any) => typeof a === "string" ? a : a._id); onChange(ids.includes(uid) ? ids.filter(id => id !== uid) : [...ids, uid]); };
  const assigneeIds = assignees.map((a: any) => typeof a === "string" ? a : a._id);
  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-1 hover:opacity-80 transition-opacity">
        {assignees.length > 0 ? (
          <div className="flex -space-x-1.5 flex-wrap">
            {assignees.slice(0, 2).map((a: any, i) => (
              <div key={i} className="w-5 h-5 rounded-full border-2 border-surface bg-gradient-to-br from-cyan/40 to-violet/30 flex items-center justify-center text-[8px] font-bold text-white overflow-hidden" title={a.name}>
                {a.avatar ? <img src={a.avatar} className="w-full h-full object-cover" alt="" /> : a.name?.[0]}
              </div>
            ))}
          </div>
        ) : <UserPlus size={12} className="text-muted/40 hover:text-muted transition-colors" />}
      </button>
      <AnimatePresence>
        {open && (
           <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute bottom-full mb-1 sm:bottom-auto sm:mb-0 sm:top-full sm:mt-1 left-0 sm:left-auto sm:right-0 z-50 bg-surface border border-muted/15 rounded-xl shadow-2xl min-w-[150px] py-1 max-h-48 overflow-y-auto">
            {users.map(u => {
              const checked = assigneeIds.includes(u._id);
              return (
                <button key={u._id} onClick={() => toggle(u._id)} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/5 transition-colors text-left ${checked ? "text-foreground" : "text-muted"}`}>
                  <div className="w-4 h-4 rounded-full bg-cyan/40 flex shrink-0 items-center justify-center text-[6px] font-bold text-white overflow-hidden">{u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" alt="" /> : u.name?.[0]}</div>
                  <span className="flex-1 truncate leading-tight">{u.name}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PriorityPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const priorities = [{ value: "URGENT", label: "Urgent", color: "text-red-500" }, { value: "HIGH", label: "High", color: "text-amber-500" }, { value: "NORMAL", label: "Normal", color: "text-blue-500" }, { value: "LOW", label: "Low", color: "text-slate-400" }];
  const current = priorities.find(p => p.value === value) || priorities[2];
  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(v => !v)} className="flex items-center justify-center p-0.5 rounded hover:bg-muted/10">
        <Flag size={11} className={current.color} />
      </button>
      <AnimatePresence>
        {open && (
           <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute bottom-full mb-1 sm:bottom-auto sm:mb-0 sm:top-full sm:mt-1 right-0 z-50 bg-surface border border-muted/15 rounded-xl shadow-2xl min-w-[110px] py-1">
            {priorities.map(p => (
              <button key={p.value} onClick={() => { onChange(p.value); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/5 text-left ${value === p.value ? "text-foreground bg-muted/5" : "text-muted"}`}>
                <Flag size={10} className={p.color} /><span className="flex-1 leading-tight">{p.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusPicker({ value, activeStatuses, onChange }: { value: string; activeStatuses: any[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const current = activeStatuses.find(s => s.name === value);
  const hex = current ? statusHex(current.color) : "#6b7280";
  return (
    <div ref={ref} className="relative shrink-0 flex items-center justify-center" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(v => !v)} className="hover:scale-110 transition-transform">
        <div className="w-2.5 h-2.5 rounded-full border-2 transition-colors" style={{ borderColor: hex }} />
      </button>
      <AnimatePresence>
        {open && (
           <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute bottom-full mb-1 sm:bottom-auto sm:mb-0 sm:top-full sm:mt-1 left-0 z-50 bg-surface border border-muted/15 rounded-xl shadow-2xl min-w-[130px] py-1 max-h-48 overflow-y-auto">
            {activeStatuses.map(s => {
              const hx = statusHex(s.color);
              const SIcon = STATUS_ICONS[s.name] || CircleDashed;
              return (
                <button key={s.name} onClick={() => { onChange(s.name); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[10px] hover:bg-muted/5 text-left ${value === s.name ? "text-foreground bg-muted/5" : "text-muted"}`}>
                  <SIcon size={10} style={{ color: hx }} /><span className="flex-1 uppercase font-semibold tracking-wider">{s.name}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DatePicker({ value, onChange }: { value: string | null; onChange: (d: string) => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const formatted = value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null;
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => inputRef.current?.showPicker?.()} className="flex items-center gap-1 text-muted/50 hover:text-muted transition-colors">
        {formatted ? <span className="text-[10px] text-foreground/70">{formatted}</span> : <Calendar size={11} />}
      </button>
      <input ref={inputRef} type="date" value={value ? new Date(value).toISOString().split("T")[0] : ""} onChange={e => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
    </div>
  );
}
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("./RichTextEditor"), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse bg-muted/5 rounded-xl w-full" />,
});

interface TaskModalProps {
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: (task: any) => void;
  users: any[];
  boardStatuses: any[];
  boardName?: string;
  pageName?: string;
}

const spring = { type: "spring", stiffness: 420, damping: 34 } as const;

function statusHex(color: string) {
  const map: Record<string, string> = {
    "text-green-400": "#4ade80", "text-blue-400": "#60a5fa",
    "text-yellow-400": "#facc15", "text-red-400": "#f87171",
    "text-purple-400": "#c084fc", "text-cyan-400": "#22d3ee",
    "gray": "#6b7280",
  };
  return map[color] || "#6b7280";
}

export default function TaskModal({
  taskId, isOpen, onClose, onTaskUpdated, users, boardStatuses, boardName, pageName
}: TaskModalProps) {
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [creatingSubtask, setCreatingSubtask] = useState(false);
  const [subtasksExpanded, setSubtasksExpanded] = useState(true);

  // Navigation stack: [{_id, title}]
  const [taskStack, setTaskStack] = useState<{ _id: string; title: string }[]>([]);
  const currentItem = taskStack[taskStack.length - 1] || null;
  const currentTaskId = currentItem?._id || null;
  const [slideDir, setSlideDir] = useState(1);

  // ── Fetch ─────────────────────────────────────────────────────────────────────
  const fetchTaskDetails = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const [taskRes, commentsRes, subtasksRes] = await Promise.all([
        fetch(`/api/tasks/${id}`),
        fetch(`/api/tasks/${id}/comments`),
        fetch(`/api/tasks?parentId=${id}`),
      ]);
      const [taskJson, commentsJson, subtasksJson] = await Promise.all([
        taskRes.json(), commentsRes.json(), subtasksRes.json(),
      ]);
      if (taskJson.success) {
        setTask(taskJson.data);
        setTaskStack(prev => prev.map(t => t._id === id ? { ...t, title: taskJson.data.title } : t));
      }
      if (commentsJson.success) setComments(commentsJson.data);
      if (subtasksJson.success) setSubtasks(subtasksJson.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && taskId) {
      setTaskStack([{ _id: taskId, title: "…" }]);
      setSlideDir(1);
    } else if (!isOpen) {
      setTaskStack([]);
      setTask(null);
      setComments([]);
      setSubtasks([]);
    }
  }, [isOpen, taskId]);

  useEffect(() => {
    if (currentTaskId) fetchTaskDetails(currentTaskId);
  }, [currentTaskId, fetchTaskDetails]);

  // ── Actions ───────────────────────────────────────────────────────────────────
  const handleUpdate = async (updates: any) => {
    if (!currentTaskId) return;
    setSavingTask(true);
    const res = await fetch(`/api/tasks/${currentTaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (json.success) {
      setTask(json.data);
      onTaskUpdated(json.data);
    }
    setSavingTask(false);
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !currentTaskId) return;
    setPostingComment(true);
    const res = await fetch(`/api/tasks/${currentTaskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment }),
    });
    const json = await res.json();
    if (json.success) { setComments(prev => [...prev, json.data]); setNewComment(""); }
    setPostingComment(false);
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !task) return;
    setCreatingSubtask(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newSubtaskTitle,
        parent_task_id: currentTaskId,
        status: boardStatuses?.[0]?.name || "TODO",
        board_id: task.board_id,
        page_id: task.page_id,
      }),
    });
    const json = await res.json();
    if (json.success) { setSubtasks(prev => [json.data, ...prev]); setNewSubtaskTitle(""); }
    setCreatingSubtask(false);
  };

  const patchSubtask = async (id: string, updates: any) => {
    const res = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
    const json = await res.json();
    if (json.success) {
      setSubtasks(prev => prev.map(s => String(s._id) === id ? json.data : s));
    }
  };

  const handleToggleAssignee = (userId: string) => {
    const current = (task.assignee_ids || []).map((u: any) => typeof u === "string" ? u : u._id);
    const updated = current.includes(userId)
      ? current.filter((id: string) => id !== userId)
      : [...current, userId];
    handleUpdate({ assignee_ids: updated });
  };

  const drillDown = (sub: any) => {
    setSlideDir(1);
    setTaskStack(prev => [...prev, { _id: String(sub._id), title: sub.title }]);
  };

  const drillUp = (index: number) => {
    setSlideDir(-1);
    setTaskStack(prev => prev.slice(0, index + 1));
  };

  const executeDelete = async () => {
    if (!currentTaskId) return;
    setDeletingTask(true);
    const res = await fetch(`/api/tasks/${currentTaskId}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      if (taskStack.length > 1) {
        setSlideDir(-1);
        setTaskStack(prev => prev.slice(0, -1));
      } else {
        onTaskUpdated({ _id: currentTaskId, deleted: true });
        onClose();
      }
    }
    setDeletingTask(false);
    setShowDeleteConfirm(false);
  };

  if (!isOpen) return null;

  const activeStatus = boardStatuses?.find((s: any) => s.name === task?.status);
  const hex = activeStatus ? statusHex(activeStatus.color) : "#6b7280";

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Panel — full-screen on mobile, 60vw on desktop */}
        <motion.div
          initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
          transition={spring}
          className="relative w-full sm:max-w-[90vw] lg:max-w-[60vw] h-full bg-surface border-l border-muted/10 shadow-2xl flex overflow-hidden"
        >
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={22} className="animate-spin text-cyan" />
            </div>
          ) : !task ? (
            <div className="flex-1 flex items-center justify-center text-muted text-sm">Task not found</div>
          ) : (
            <AnimatePresence custom={slideDir} mode="wait">
              <motion.div
                key={currentTaskId}
                custom={slideDir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={spring}
                className="absolute inset-0 flex flex-col sm:flex-row overflow-hidden"
              >
                {/* ── MAIN CONTENT ───────────────────────────────────────────── */}
                <div className="flex-1 flex flex-col overflow-hidden border-b sm:border-b-0 sm:border-r border-muted/10">

                  {/* Header */}
                  <div className="shrink-0 px-5 pt-5 pb-4 border-b border-muted/10">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1 text-[10px] text-muted flex-wrap mb-3">
                      {boardName && <span>{boardName}</span>}
                      {boardName && pageName && <ChevronRight size={9} />}
                      {pageName && <span>{pageName}</span>}
                      {taskStack.map((item, i) => (
                        <React.Fragment key={item._id}>
                          <ChevronRight size={9} />
                          <span
                            onClick={() => i < taskStack.length - 1 && drillUp(i)}
                            className={`max-w-[100px] truncate ${i === taskStack.length - 1 ? "text-foreground font-semibold" : "hover:text-foreground cursor-pointer"}`}
                          >
                            {item.title}
                          </span>
                        </React.Fragment>
                      ))}
                      {savingTask && <Loader2 size={9} className="animate-spin ml-1 text-cyan" />}
                    </div>

                    {/* Status + close row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="relative">
                        <select
                          value={task.status || ""}
                          onChange={e => handleUpdate({ status: e.target.value })}
                          className="appearance-none text-[11px] font-bold px-3 py-1.5 pr-7 rounded-lg border cursor-pointer focus:outline-none transition-all"
                          style={{ color: hex, borderColor: `${hex}40`, backgroundColor: `${hex}15` }}
                        >
                          {boardStatuses?.map((s: any) => (
                            <option key={s.name} value={s.name} className="bg-surface text-foreground">{s.name}</option>
                          ))}
                        </select>
                        <ChevronRight size={9} className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" style={{ color: hex }} />
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setShowDeleteConfirm(true)} title="Delete" className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition-all">
                          <Trash2 size={14} />
                        </button>
                        <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-muted/10 transition-all">
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <input
                      type="text"
                      value={task.title}
                      onChange={e => setTask({ ...task, title: e.target.value })}
                      onBlur={e => handleUpdate({ title: e.target.value })}
                      className="w-full text-xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted/40 mb-3"
                      placeholder="Task title"
                    />

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-muted flex-wrap">
                      <div className="flex items-center gap-2 relative group/assign">
                        <UserPlus size={12} className="shrink-0" />
                        <div className="flex -space-x-1.5">
                          {(task.assignee_ids || []).map((a: any, i: number) => (
                            <div key={i} title={a.name} className="w-5 h-5 rounded-full border-2 border-surface bg-gradient-to-br from-violet/40 to-cyan/40 flex items-center justify-center text-[7px] font-bold text-white overflow-hidden">
                              {a.avatar ? <img src={a.avatar} alt="" className="w-full h-full object-cover" /> : a.name?.[0]}
                            </div>
                          ))}
                          {!task.assignee_ids?.length && <span className="text-muted/50 text-[10px]">Unassigned</span>}
                        </div>
                        <select className="absolute inset-0 opacity-0 cursor-pointer w-full" onChange={e => handleToggleAssignee(e.target.value)} value="">
                          <option value="" disabled>Toggle member</option>
                          {users.map(u => (
                            <option key={u._id} value={u._id}>
                              {(task.assignee_ids || []).some((a: any) => a._id === u._id) ? "✓ " : ""}{u.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} />
                        <input
                          type="date"
                          value={task.due_date ? new Date(task.due_date).toISOString().split("T")[0] : ""}
                          onChange={e => handleUpdate({ due_date: e.target.value })}
                          className="bg-transparent text-[11px] outline-none cursor-pointer text-muted"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Scrollable body */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
                    {/* Description */}
                    <div>
                      <h3 className="text-[11px] font-bold tracking-widest uppercase text-muted flex items-center gap-2 mb-3">
                        <FileText size={11} /> Description
                      </h3>
                      <RichTextEditor data={task.description} onChange={data => handleUpdate({ description: data })} />
                    </div>

                    {/* Subtasks */}
                    <div>
                      <button
                        onClick={() => setSubtasksExpanded(v => !v)}
                        className="w-full flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-muted hover:text-foreground transition-colors mb-1"
                      >
                        <GitMerge size={11} />
                        Subtasks
                        <span className="text-[9px] bg-muted/10 px-1.5 py-0.5 rounded-full font-bold">{subtasks.length}</span>
                        <motion.div animate={{ rotate: subtasksExpanded ? 90 : 0 }} transition={{ duration: 0.15 }} className="ml-auto">
                          <ChevronRight size={10} />
                        </motion.div>
                      </button>

                      <AnimatePresence>
                        {subtasksExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                              {/* Headers */}
                              {subtasks.length > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-muted/5 text-[9px] font-bold uppercase tracking-wider text-muted/50">
                                  <div className="w-3 shrink-0" />
                                  <div className="flex-1">Name</div>
                                  <div className="w-16 text-center shrink-0">Assignee</div>
                                  <div className="w-16 text-center shrink-0">Priority</div>
                                  <div className="w-16 text-center shrink-0">Due Date</div>
                                </div>
                              )}
                              {subtasks.map(sub => (
                                <div
                                  key={String(sub._id)}
                                  className="flex items-center gap-2 px-3 py-1.5 border-b border-muted/5 hover:bg-muted/5 transition-colors group cursor-pointer"
                                  onClick={() => drillDown(sub)}
                                >
                                  {/* Status */}
                                  <div className="shrink-0 w-4 flex justify-center" onClick={e => e.stopPropagation()}>
                                    <StatusPicker value={sub.status} activeStatuses={boardStatuses} onChange={s => patchSubtask(String(sub._id), { status: s })} />
                                  </div>
                                  
                                  {/* Title */}
                                  <span className="text-[13px] font-medium text-foreground/80 group-hover:text-cyan transition-colors flex-1 truncate">{sub.title}</span>
                                  
                                  {/* Assignee */}
                                  <div className="shrink-0 w-16 flex justify-center" onClick={e => e.stopPropagation()}>
                                    <AssigneePicker assignees={sub.assignee_ids || []} users={users} onChange={ids => patchSubtask(String(sub._id), { assignee_ids: ids })} />
                                  </div>

                                  {/* Priority */}
                                  <div className="shrink-0 w-16 flex justify-center" onClick={e => e.stopPropagation()}>
                                    <PriorityPicker value={sub.priority || "NORMAL"} onChange={p => patchSubtask(String(sub._id), { priority: p })} />
                                  </div>

                                  {/* Due Date */}
                                  <div className="shrink-0 w-16 flex justify-center" onClick={e => e.stopPropagation()}>
                                    <DatePicker value={sub.due_date || null} onChange={d => patchSubtask(String(sub._id), { due_date: d })} />
                                  </div>
                                </div>
                              ))}
                            <form onSubmit={handleAddSubtask} className="flex items-center gap-2">
                              <input
                                value={newSubtaskTitle}
                                onChange={e => setNewSubtaskTitle(e.target.value)}
                                placeholder="New subtask…"
                                className="flex-1 bg-muted/5 border border-muted/10 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted/40 focus:outline-none focus:border-cyan/40"
                              />
                              <button disabled={creatingSubtask || !newSubtaskTitle.trim()} className="p-2 bg-cyan/80 rounded-xl hover:bg-cyan disabled:opacity-30 transition-colors">
                                {creatingSubtask ? <Loader2 size={13} className="animate-spin text-white" /> : <Plus size={13} className="text-white" />}
                              </button>
                            </form>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* ── ACTIVITY SIDEBAR ───────────────────────────────────────── */}
                {/* Hidden on very small screens, shown as full-width below on sm */}
                <div className="hidden sm:flex w-72 shrink-0 flex-col bg-muted/[0.02]">
                  <div className="px-4 py-4 border-b border-muted/10">
                    <h3 className="text-[11px] font-bold tracking-widest uppercase text-muted flex items-center gap-2">
                      <MessageSquare size={11} /> Activity
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                    {comments.length === 0 ? (
                      <p className="text-[11px] text-muted/50 text-center pt-8">No comments yet.</p>
                    ) : comments.map(c => (
                      <div key={c._id} className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet/30 to-cyan/30 border border-muted/10 flex items-center justify-center text-[9px] font-bold text-white shrink-0 overflow-hidden">
                          {c.author_id?.avatar ? <img src={c.author_id.avatar} alt="" className="w-full h-full object-cover" /> : c.author_id?.name?.[0]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="text-[11px] font-bold text-foreground">{c.author_id?.name}</span>
                            <span className="text-[9px] text-muted">{new Date(c.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-foreground/70 bg-muted/5 border border-muted/10 rounded-xl rounded-tl-sm p-3 leading-relaxed">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-muted/10">
                    <form onSubmit={e => { e.preventDefault(); handlePostComment(); }} className="relative">
                      <textarea
                        value={newComment} onChange={e => setNewComment(e.target.value)}
                        placeholder="Comment…" rows={2}
                        className="w-full bg-muted/5 border border-muted/10 rounded-xl text-xs text-foreground placeholder:text-muted/40 p-3 pr-10 resize-none focus:outline-none focus:border-cyan/40"
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePostComment(); } }}
                      />
                      <button type="submit" disabled={postingComment || !newComment.trim()} className="absolute right-2.5 bottom-2.5 p-1.5 bg-cyan/80 rounded-lg hover:bg-cyan disabled:opacity-30 transition-colors">
                        {postingComment ? <Loader2 size={12} className="animate-spin text-white" /> : <Send size={12} className="text-white" />}
                      </button>
                    </form>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Delete confirm */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteConfirm(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }} transition={spring} className="relative bg-surface border border-red-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/15 flex items-center justify-center shrink-0">
                      <Trash2 size={15} className="text-red-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground mb-1">Delete Task?</h3>
                      <p className="text-xs text-muted leading-relaxed">
                        "<span className="text-foreground">{task?.title}</span>" and all nested subtasks will be permanently removed.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-xs text-muted hover:text-foreground transition-colors font-semibold">Cancel</button>
                    <button onClick={executeDelete} disabled={deletingTask} className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 disabled:opacity-50 flex items-center gap-1.5 transition-colors">
                      {deletingTask ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      Delete Permanently
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
