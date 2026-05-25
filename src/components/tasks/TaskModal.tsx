"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Clock, MessageSquare, UserPlus, FileText, Send,
  Loader2, GitMerge, ChevronRight, Trash2, Plus,
  CheckCircle2, CircleDashed, Eye, Flag, Calendar,
  Smile, CornerDownRight, AtSign, ChevronDown, Hash,
  AlignLeft, Link2, Paperclip, MoreHorizontal, Check,
  ArrowRight
} from "lucide-react";
import { useSession } from "next-auth/react";
import DynamicEditor from "@/src/components/editor/DynamicEditor";

const STATUS_ICONS: Record<string, any> = {
  DONE: CheckCircle2, IN_PROGRESS: Clock, REVIEW: Eye, TODO: CircleDashed,
};

function statusHex(color: string) {
  if (color && (color.startsWith("#") || color.startsWith("rgb"))) return color;
  const map: Record<string, string> = {
    "text-green-400": "#4ade80", "text-blue-400": "#60a5fa",
    "text-yellow-400": "#facc15", "text-red-400": "#f87171",
    "text-purple-400": "#c084fc", "text-cyan-400": "#22d3ee",
    "text-amber-400": "#fbbf24", "text-emerald-400": "#34d399",
    "text-muted": "#6b7280", "gray": "#6b7280",
  };
  return map[color] || "#6b7280";
}

// ─── ClickUp-style Status Chip ────────────────────────────────────────────────
function StatusChip({ value, activeStatuses, onChange }: {
  value: string; activeStatuses: any[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const current = activeStatuses.find(s => s.name === value);
  const hex = current ? statusHex(current.color) : "#6b7280";
  const SIcon = STATUS_ICONS[value] || CircleDashed;

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase transition-all hover:opacity-90 active:scale-95"
        style={{ backgroundColor: `${hex}20`, color: hex, border: `1px solid ${hex}40` }}
      >
        <SIcon size={10} />
        {value}
        <ChevronDown size={9} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full mt-1.5 left-0 z-50 bg-surface border border-muted/15 rounded-xl shadow-2xl min-w-[160px] py-1.5 overflow-hidden"
          >
            <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-muted/50 mb-0.5">Change Status</div>
            {activeStatuses.map(s => {
              const hx = statusHex(s.color);
              const SI = STATUS_ICONS[s.name] || CircleDashed;
              const active = value === s.name;
              return (
                <button
                  key={s.name}
                  onClick={() => { onChange(s.name); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left ${active ? "bg-muted/8" : "hover:bg-muted/5"}`}
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: hx }} />
                  <span className={`flex-1 font-semibold uppercase tracking-wide text-[10px] ${active ? "text-foreground" : "text-muted"}`}>{s.name}</span>
                  {active && <Check size={10} style={{ color: hx }} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Small inline status dot (for subtask rows) ───────────────────────────────
function StatusDot({ value, activeStatuses, onChange }: {
  value: string; activeStatuses: any[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const current = activeStatuses.find(s => s.name === value);
  const hex = current ? statusHex(current.color) : "#6b7280";

  return (
    <div ref={ref} className="relative shrink-0" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        title={value}
        className="w-4 h-4 rounded-full flex items-center justify-center hover:scale-125 transition-transform"
        style={{ backgroundColor: `${hex}20`, border: `2px solid ${hex}` }}
      />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.96 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full mt-1 left-0 z-[100] bg-surface border border-muted/15 rounded-xl shadow-2xl min-w-[150px] py-1 overflow-hidden"
          >
            {activeStatuses.map(s => {
              const hx = statusHex(s.color);
              return (
                <button
                  key={s.name}
                  onClick={() => { onChange(s.name); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted/5 text-left"
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: hx }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{s.name}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Priority Picker ──────────────────────────────────────────────────────────
const PRIORITIES = [
  { value: "URGENT", label: "Urgent", color: "#ef4444", bg: "#fef2f2" },
  { value: "HIGH",   label: "High",   color: "#f59e0b", bg: "#fffbeb" },
  { value: "NORMAL", label: "Normal", color: "#6366f1", bg: "#eef2ff" },
  { value: "LOW",    label: "Low",    color: "#94a3b8", bg: "#f8fafc" },
];

function PriorityChip({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const current = PRIORITIES.find(p => p.value === value) || PRIORITIES[2];

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 p-1 rounded hover:bg-muted/8 transition-colors"
        title={current.label}
      >
        <Flag size={11} style={{ color: current.color }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.97 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full mt-1 right-0 z-[100] bg-surface border border-muted/15 rounded-xl shadow-2xl min-w-[130px] py-1 overflow-hidden"
          >
            {PRIORITIES.map(p => (
              <button
                key={p.value}
                onClick={() => { onChange(p.value); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted/5 text-left transition-colors ${value === p.value ? "text-foreground" : "text-muted"}`}
              >
                <Flag size={10} style={{ color: p.color }} />
                <span className="flex-1 font-medium">{p.label}</span>
                {value === p.value && <Check size={10} className="text-muted/50" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Assignee Picker ──────────────────────────────────────────────────────────
function AssigneePicker({ assignees, users, onChange }: {
  assignees: any[]; users: any[]; onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const toggle = (uid: string) => {
    const ids = assignees.map((a: any) => typeof a === "string" ? a : a._id);
    onChange(ids.includes(uid) ? ids.filter(id => id !== uid) : [...ids, uid]);
  };
  const assigneeIds = assignees.map((a: any) => typeof a === "string" ? a : a._id);

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-1 hover:opacity-80 transition-opacity">
        {assignees.length > 0 ? (
          <div className="flex -space-x-1">
            {assignees.slice(0, 2).map((a: any, i) => (
              <div key={i} title={a.name}
                className="w-5 h-5 rounded-full border-2 border-surface bg-gradient-to-br from-violet/50 to-cyan/40 flex items-center justify-center text-[7px] font-bold text-white overflow-hidden">
                {a.avatar ? <img src={a.avatar} className="w-full h-full object-cover" alt="" /> : a.name?.[0]}
              </div>
            ))}
            {assignees.length > 2 && (
              <div className="w-5 h-5 rounded-full border-2 border-surface bg-muted/20 flex items-center justify-center text-[7px] font-bold text-muted">
                +{assignees.length - 2}
              </div>
            )}
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full border border-dashed border-muted/30 flex items-center justify-center hover:border-muted/60 transition-colors">
            <UserPlus size={9} className="text-muted/40" />
          </div>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.97 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full mt-1 left-0 z-[100] bg-surface border border-muted/15 rounded-xl shadow-2xl min-w-[170px] py-1 max-h-48 overflow-y-auto"
          >
            <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-muted/50">Assign to</div>
            {users.map(u => {
              const checked = assigneeIds.includes(u._id);
              return (
                <button key={u._id} onClick={() => toggle(u._id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-muted/5 transition-colors text-left ${checked ? "text-foreground" : "text-muted"}`}>
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet/40 to-cyan/30 flex shrink-0 items-center justify-center text-[7px] font-bold text-white overflow-hidden">
                    {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" alt="" /> : u.name?.[0]}
                  </div>
                  <span className="flex-1 truncate font-medium">{u.name}</span>
                  {checked && <Check size={10} className="text-cyan shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Date Picker ──────────────────────────────────────────────────────────────
function DatePicker({ value, onChange }: { value: string | null; onChange: (d: string) => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const formatted = value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null;
  const isOverdue = value && new Date(value) < new Date();
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => inputRef.current?.showPicker?.()} className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted/8 transition-colors">
        {formatted
          ? <span className={`text-[11px] font-medium ${isOverdue ? "text-red-500" : "text-foreground/60"}`}>{formatted}</span>
          : <Calendar size={11} className="text-muted/40" />}
      </button>
      <input ref={inputRef} type="date" value={value ? new Date(value).toISOString().split("T")[0] : ""} onChange={e => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
    </div>
  );
}

// ─── Main Interface ───────────────────────────────────────────────────────────
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

export default function TaskModal({
  taskId, isOpen, onClose, onTaskUpdated, users, boardStatuses, boardName, pageName
}: TaskModalProps) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id || null;

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [mentionQuery, setMentionQuery] = useState<{ active: boolean; text: string; cursor: number } | null>(null);
  const [mentionedIds, setMentionedIds] = useState<Set<string>>(new Set());

  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [creatingSubtask, setCreatingSubtask] = useState(false);
  const [subtasksExpanded, setSubtasksExpanded] = useState(true);
  const [addingChildFor, setAddingChildFor] = useState<string | null>(null);
  const [newChildTitle, setNewChildTitle] = useState("");
  const [creatingChild, setCreatingChild] = useState(false);
  const [childCounts, setChildCounts] = useState<Record<string, number>>({});
  const [showAddSubtask, setShowAddSubtask] = useState(false);

  const [taskStack, setTaskStack] = useState<{ _id: string; title: string }[]>([]);
  const currentItem = taskStack[taskStack.length - 1] || null;
  const currentTaskId = currentItem?._id || null;
  const [slideDir, setSlideDir] = useState(1);

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
      if (subtasksJson.success) {
        setSubtasks(subtasksJson.data);
        const counts: Record<string, number> = {};
        await Promise.all(
          subtasksJson.data.map(async (sub: any) => {
            const r = await fetch(`/api/tasks?parentId=${sub._id}`);
            const j = await r.json();
            counts[String(sub._id)] = j.success ? j.data.length : 0;
          })
        );
        setChildCounts(counts);
      }
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
      setChildCounts({});
      setAddingChildFor(null);
      setNewChildTitle("");
      setShowAddSubtask(false);
    }
  }, [isOpen, taskId]);

  useEffect(() => { if (currentTaskId) fetchTaskDetails(currentTaskId); }, [currentTaskId, fetchTaskDetails]);

  const handleUpdate = async (updates: any) => {
    if (!currentTaskId) return;
    setSavingTask(true);
    const res = await fetch(`/api/tasks/${currentTaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (json.success) { setTask(json.data); onTaskUpdated(json.data); }
    setSavingTask(false);
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !currentTaskId) return;
    setPostingComment(true);
    const res = await fetch(`/api/tasks/${currentTaskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment, parent_id: replyingTo?._id || null, mentions: Array.from(mentionedIds) }),
    });
    const json = await res.json();
    if (json.success) { setComments(prev => [...prev, json.data]); setNewComment(""); setReplyingTo(null); setMentionedIds(new Set()); }
    setPostingComment(false);
  };

  const toggleReaction = async (commentId: string, emoji: string) => {
    if (!currentTaskId) return;
    const res = await fetch(`/api/tasks/${currentTaskId}/comments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId, emoji }),
    });
    const json = await res.json();
    if (json.success) setComments(prev => prev.map(c => String(c._id) === commentId ? json.data : c));
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewComment(val);
    const cursor = e.target.selectionStart;
    const lastAt = val.lastIndexOf("@", cursor - 1);
    const lastSpace = val.lastIndexOf(" ", cursor - 1);
    if (lastAt > lastSpace && lastAt >= 0) {
      setMentionQuery({ active: true, text: val.substring(lastAt + 1, cursor), cursor: lastAt });
    } else {
      setMentionQuery(null);
    }
  };

  const handleSelectMention = (user: any) => {
    if (!mentionQuery) return;
    const before = newComment.substring(0, mentionQuery.cursor);
    const after = newComment.substring(mentionQuery.cursor + mentionQuery.text.length + 1);
    setNewComment(`${before}@${user.name} ${after}`);
    setMentionedIds(prev => new Set([...prev, user._id]));
    setMentionQuery(null);
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
    if (json.success) {
      setSubtasks(prev => [...prev, json.data]);
      setChildCounts(prev => ({ ...prev, [String(json.data._id)]: 0 }));
      setNewSubtaskTitle("");
    }
    setCreatingSubtask(false);
  };

  const handleAddChildTask = async (e: React.FormEvent, parentSubId: string) => {
    e.preventDefault();
    if (!newChildTitle.trim() || !task) return;
    setCreatingChild(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newChildTitle,
        parent_task_id: parentSubId,
        status: boardStatuses?.[0]?.name || "TODO",
        board_id: task.board_id,
        page_id: task.page_id,
      }),
    });
    const json = await res.json();
    if (json.success) {
      setChildCounts(prev => ({ ...prev, [parentSubId]: (prev[parentSubId] || 0) + 1 }));
      setAddingChildFor(null);
      setNewChildTitle("");
    }
    setCreatingChild(false);
  };

  const patchSubtask = async (id: string, updates: any) => {
    const res = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
    const json = await res.json();
    if (json.success) setSubtasks(prev => prev.map(s => String(s._id) === id ? json.data : s));
  };

  const handleToggleAssignee = (userId: string) => {
    const current = (task.assignee_ids || []).map((u: any) => typeof u === "string" ? u : u._id);
    handleUpdate({ assignee_ids: current.includes(userId) ? current.filter((id: string) => id !== userId) : [...current, userId] });
  };

  const drillDown = (sub: any) => { setSlideDir(1); setTaskStack(prev => [...prev, { _id: String(sub._id), title: sub.title }]); };
  const drillUp = (index: number) => { setSlideDir(-1); setTaskStack(prev => prev.slice(0, index + 1)); };

  const executeDelete = async () => {
    if (!currentTaskId) return;
    setDeletingTask(true);
    const res = await fetch(`/api/tasks/${currentTaskId}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      if (taskStack.length > 1) { setSlideDir(-1); setTaskStack(prev => prev.slice(0, -1)); }
      else { onTaskUpdated({ _id: currentTaskId, deleted: true }); onClose(); }
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
          className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        />

        {/* Panel */}
        <motion.div
          initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
          transition={spring}
          className="relative w-full sm:max-w-[92vw] lg:max-w-[68vw] h-full bg-background border-l border-muted/10 shadow-2xl flex overflow-hidden"
        >
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={20} className="animate-spin text-muted/40" />
                <span className="text-xs text-muted/40">Loading task…</span>
              </div>
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
                {/* ── LEFT: MAIN CONTENT ───────────────────────────────────── */}
                <div className="flex-1 flex flex-col overflow-hidden border-b sm:border-b-0 sm:border-r border-muted/10">

                  {/* ── TOP BAR ─────────────────────────────────────────────── */}
                  <div className="shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-muted/8 bg-surface/50">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1 text-[11px] text-muted/50 flex-wrap min-w-0">
                      {boardName && <span className="hover:text-muted cursor-default truncate max-w-[80px]">{boardName}</span>}
                      {boardName && pageName && <ChevronRight size={10} className="shrink-0" />}
                      {pageName && <span className="hover:text-muted cursor-default truncate max-w-[80px]">{pageName}</span>}
                      {taskStack.map((item, i) => (
                        <React.Fragment key={item._id}>
                          <ChevronRight size={10} className="shrink-0 text-muted/30" />
                          <button
                            onClick={() => i < taskStack.length - 1 && drillUp(i)}
                            className={`truncate max-w-[120px] transition-colors ${i === taskStack.length - 1 ? "text-foreground/70 font-medium" : "hover:text-foreground cursor-pointer"}`}
                          >
                            {item.title}
                          </button>
                        </React.Fragment>
                      ))}
                      {savingTask && <Loader2 size={9} className="animate-spin ml-1 text-muted/50" />}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => setShowDeleteConfirm(true)} title="Delete task"
                        className="p-1.5 rounded-lg text-muted/40 hover:text-red-500 hover:bg-red-500/8 transition-all">
                        <Trash2 size={13} />
                      </button>
                      <button onClick={onClose}
                        className="p-1.5 rounded-lg text-muted/40 hover:text-foreground hover:bg-muted/8 transition-all">
                        <X size={15} />
                      </button>
                    </div>
                  </div>

                  {/* ── SCROLLABLE BODY ─────────────────────────────────────── */}
                  <div className="flex-1 overflow-y-auto no-scrollbar">

                    {/* Status + title area */}
                    <div className="px-6 pt-5 pb-4">
                      {/* Status chip */}
                      <div className="mb-3">
                        <StatusChip value={task.status || ""} activeStatuses={boardStatuses} onChange={s => handleUpdate({ status: s })} />
                      </div>

                      {/* Title */}
                      <input
                        type="text"
                        value={task.title}
                        onChange={e => setTask({ ...task, title: e.target.value })}
                        onBlur={e => handleUpdate({ title: e.target.value })}
                        className="w-full text-[22px] font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted/30 leading-tight mb-4"
                        placeholder="Task title"
                      />

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                        {/* Assignees */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] text-muted/50 font-semibold uppercase tracking-wider w-16 shrink-0">Assignee</span>
                          <AssigneePicker
                            assignees={task.assignee_ids || []}
                            users={users}
                            onChange={ids => handleUpdate({ assignee_ids: ids })}
                          />
                        </div>

                        {/* Due date */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted/50 font-semibold uppercase tracking-wider w-16 shrink-0">Due date</span>
                          <div className="relative">
                            <input
                              type="date"
                              value={task.due_date ? new Date(task.due_date).toISOString().split("T")[0] : ""}
                              onChange={e => handleUpdate({ due_date: e.target.value })}
                              className="text-[12px] text-foreground/60 bg-transparent outline-none cursor-pointer hover:text-foreground transition-colors"
                            />
                          </div>
                        </div>

                        {/* Priority */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted/50 font-semibold uppercase tracking-wider w-16 shrink-0">Priority</span>
                          {(() => {
                            const p = PRIORITIES.find(x => x.value === (task.priority || "NORMAL")) || PRIORITIES[2];
                            return (
                              <div className="relative">
                                <div
                                  className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                                  style={{ color: p.color, backgroundColor: `${p.color}15` }}
                                >
                                  <Flag size={9} />
                                  {p.label}
                                </div>
                                <select
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                  value={task.priority || "NORMAL"}
                                  onChange={e => handleUpdate({ priority: e.target.value })}
                                >
                                  {PRIORITIES.map(pr => <option key={pr.value} value={pr.value}>{pr.label}</option>)}
                                </select>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-muted/8 mx-6" />

                    {/* Description */}
                    <div className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-2.5">
                        <AlignLeft size={12} className="text-muted/40" />
                        <span className="text-[11px] font-semibold text-muted/50 uppercase tracking-wider">Description</span>
                      </div>
                      <div className="min-h-[200px] border border-muted/10 rounded-xl p-4 bg-transparent">
                        <DynamicEditor initialData={task.description} onChange={data => handleUpdate({ description: data })} />
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-muted/8 mx-6" />

                    {/* ── SUBTASKS ───────────────────────────────────────────── */}
                    <div className="px-6 py-4">
                      {/* Section header */}
                      <div className="flex items-center justify-between mb-1">
                        <button
                          onClick={() => setSubtasksExpanded(v => !v)}
                          className="flex items-center gap-2 group"
                        >
                          <GitMerge size={12} className="text-muted/40" />
                          <span className="text-[11px] font-semibold text-muted/50 uppercase tracking-wider group-hover:text-muted/70 transition-colors">Subtasks</span>
                          {subtasks.length > 0 && (
                            <span className="text-[10px] font-bold text-muted/50 bg-muted/10 px-1.5 py-0.5 rounded-full">{subtasks.length}</span>
                          )}
                          <motion.div animate={{ rotate: subtasksExpanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
                            <ChevronRight size={10} className="text-muted/30" />
                          </motion.div>
                        </button>
                        <button
                          onClick={() => { setShowAddSubtask(true); setSubtasksExpanded(true); }}
                          className="flex items-center gap-1 text-[11px] text-muted/40 hover:text-foreground/70 transition-colors px-2 py-0.5 rounded hover:bg-muted/8"
                        >
                          <Plus size={11} />
                          <span>Add</span>
                        </button>
                      </div>

                      <AnimatePresence>
                        {subtasksExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            style={{ overflow: subtasksExpanded ? "visible" : "hidden" }}
                          >
                            {/* Column headers */}
                            {subtasks.length > 0 && (
                              <div className="flex items-center gap-1 pl-6 pr-2 py-1.5 border-b border-muted/6 mt-1">
                                <div className="flex-1 text-[9px] font-bold uppercase tracking-widest text-muted/35">Name</div>
                                <div className="w-5 shrink-0" />
                                <div className="w-[72px] text-[9px] font-bold uppercase tracking-widest text-muted/35 text-center shrink-0">Assignee</div>
                                <div className="w-10 text-[9px] font-bold uppercase tracking-widest text-muted/35 text-center shrink-0 hidden sm:block">Pri</div>
                                <div className="w-16 text-[9px] font-bold uppercase tracking-widest text-muted/35 text-center shrink-0">Due</div>
                              </div>
                            )}

                            {/* Subtask rows */}
                            <AnimatePresence>
                              {subtasks.map(sub => {
                                const subId = String(sub._id);
                                const childCount = childCounts[subId] || 0;
                                const isAddingChild = addingChildFor === subId;
                                const subStatus = boardStatuses.find(s => s.name === sub.status);
                                const subHex = subStatus ? statusHex(subStatus.color) : "#6b7280";
                                const subPriority = PRIORITIES.find(p => p.value === (sub.priority || "NORMAL")) || PRIORITIES[2];

                                return (
                                  <React.Fragment key={subId}>
                                    <motion.div
                                      layout
                                      initial={{ opacity: 0, y: 3 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, x: -8 }}
                                      className="flex items-center gap-1 pl-2 pr-2 py-[7px] border-b border-muted/5 hover:bg-muted/[0.035] transition-colors group cursor-pointer relative"
                                      style={{ borderLeft: `2.5px solid ${subHex}` }}
                                      onClick={() => drillDown(sub)}
                                    >
                                      {/* Status dot */}
                                      <div className="shrink-0 pl-1" onClick={e => e.stopPropagation()}>
                                        <StatusDot value={sub.status} activeStatuses={boardStatuses} onChange={s => patchSubtask(subId, { status: s })} />
                                      </div>

                                      {/* Title + badges */}
                                      <div className="flex-1 flex items-center gap-1.5 min-w-0 ml-2">
                                        <span className="text-[13px] font-medium text-foreground/80 group-hover:text-foreground transition-colors truncate">
                                          {sub.title}
                                        </span>
                                        {childCount > 0 && (
                                          <span className="flex items-center gap-0.5 text-[9px] text-muted/50 bg-muted/10 px-1.5 py-0.5 rounded-full border border-muted/10 shrink-0 font-semibold">
                                            <GitMerge size={7} />{childCount}
                                          </span>
                                        )}
                                        <ArrowRight size={10} className="text-muted/25 group-hover:text-muted/50 transition-colors shrink-0" />
                                      </div>

                                      {/* Add child btn (hover) */}
                                      <button
                                        onClick={e => { e.stopPropagation(); setAddingChildFor(isAddingChild ? null : subId); setNewChildTitle(""); }}
                                        title="Add nested subtask"
                                        className="shrink-0 w-5 h-5 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded hover:bg-muted/10 text-muted/50 hover:text-foreground transition-all"
                                      >
                                        <Plus size={9} />
                                      </button>

                                      {/* Assignee */}
                                      <div className="shrink-0 w-[72px] flex justify-center" onClick={e => e.stopPropagation()}>
                                        <AssigneePicker assignees={sub.assignee_ids || []} users={users} onChange={ids => patchSubtask(subId, { assignee_ids: ids })} />
                                      </div>

                                      {/* Priority */}
                                      <div className="shrink-0 w-10 flex justify-center hidden sm:flex" onClick={e => e.stopPropagation()}>
                                        <PriorityChip value={sub.priority || "NORMAL"} onChange={p => patchSubtask(subId, { priority: p })} />
                                      </div>

                                      {/* Due Date */}
                                      <div className="shrink-0 w-16 flex justify-center" onClick={e => e.stopPropagation()}>
                                        <DatePicker value={sub.due_date || null} onChange={d => patchSubtask(subId, { due_date: d })} />
                                      </div>
                                    </motion.div>

                                    {/* Inline add-child form */}
                                    <AnimatePresence>
                                      {isAddingChild && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: "auto", opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.12 }}
                                          className="overflow-hidden"
                                        >
                                          <form
                                            onSubmit={e => handleAddChildTask(e, subId)}
                                            className="flex items-center gap-2 pl-10 pr-3 py-2 bg-muted/[0.025] border-b border-muted/5"
                                          >
                                            <CornerDownRight size={10} className="text-muted/30 shrink-0" />
                                            <input
                                              autoFocus
                                              value={newChildTitle}
                                              onChange={e => setNewChildTitle(e.target.value)}
                                              placeholder="Nested subtask name…"
                                              className="flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted/35 focus:outline-none"
                                            />
                                            <button type="button" onClick={() => { setAddingChildFor(null); setNewChildTitle(""); }} className="p-1 rounded hover:bg-muted/8 text-muted/40">
                                              <X size={11} />
                                            </button>
                                            <button type="submit" disabled={creatingChild || !newChildTitle.trim()}
                                              className="px-2.5 py-1 bg-foreground text-background text-[11px] font-bold rounded-lg hover:opacity-90 disabled:opacity-30 transition-all">
                                              {creatingChild ? <Loader2 size={10} className="animate-spin" /> : "Add"}
                                            </button>
                                          </form>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </React.Fragment>
                                );
                              })}
                            </AnimatePresence>

                            {/* Add subtask inline */}
                            <AnimatePresence>
                              {showAddSubtask ? (
                                <motion.form
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  onSubmit={e => { handleAddSubtask(e); setShowAddSubtask(false); }}
                                  className="flex items-center gap-2 pl-5 pr-2 py-2 border-b border-muted/5 bg-muted/[0.02]"
                                >
                                  <div className="w-4 h-4 rounded-full border-2 border-muted/20 shrink-0" />
                                  <input
                                    autoFocus
                                    value={newSubtaskTitle}
                                    onChange={e => setNewSubtaskTitle(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Escape") { setShowAddSubtask(false); setNewSubtaskTitle(""); } }}
                                    placeholder="New subtask name…"
                                    className="flex-1 text-[13px] bg-transparent text-foreground placeholder:text-muted/35 focus:outline-none font-medium"
                                  />
                                  <button type="button" onClick={() => { setShowAddSubtask(false); setNewSubtaskTitle(""); }} className="p-1 text-muted/40 hover:text-muted rounded hover:bg-muted/8">
                                    <X size={11} />
                                  </button>
                                  <button type="submit" disabled={creatingSubtask || !newSubtaskTitle.trim()}
                                    className="px-2.5 py-1 bg-foreground text-background text-[11px] font-bold rounded-lg hover:opacity-90 disabled:opacity-30 transition-all flex items-center gap-1">
                                    {creatingSubtask ? <Loader2 size={10} className="animate-spin" /> : "Save"}
                                  </button>
                                </motion.form>
                              ) : (
                                <button
                                  onClick={() => setShowAddSubtask(true)}
                                  className="w-full flex items-center gap-2 pl-5 pr-3 py-2.5 text-[12px] text-muted/40 hover:text-muted/70 hover:bg-muted/[0.03] transition-colors group/add"
                                >
                                  <Plus size={11} className="group-hover/add:text-foreground/50 transition-colors" />
                                  <span>Add subtask</span>
                                </button>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Spacer */}
                    <div className="h-8" />
                  </div>
                </div>

                {/* ── RIGHT: ACTIVITY SIDEBAR ─────────────────────────────── */}
                <div className="hidden sm:flex w-[280px] shrink-0 flex-col bg-surface/30 border-l border-muted/8">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-muted/8 flex items-center gap-2">
                    <MessageSquare size={11} className="text-muted/40" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted/50">Activity</span>
                    {comments.length > 0 && (
                      <span className="ml-auto text-[9px] font-bold bg-muted/10 text-muted/50 px-1.5 py-0.5 rounded-full">{comments.length}</span>
                    )}
                  </div>

                  {/* Comment thread */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar">
                    {comments.filter(c => !c.parent_id).length === 0 ? (
                      <div className="flex flex-col items-center gap-2 pt-8 text-center">
                        <MessageSquare size={24} className="text-muted/20" />
                        <p className="text-[11px] text-muted/35">No comments yet. Start the conversation.</p>
                      </div>
                    ) : comments.filter(c => !c.parent_id).map(c => (
                      <div key={c._id} className="flex flex-col gap-1.5">
                        <div className="flex gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet/30 to-cyan/30 flex items-center justify-center text-[8px] font-bold text-white shrink-0 overflow-hidden mt-0.5">
                            {c.author_id?.avatar ? <img src={c.author_id.avatar} alt="" className="w-full h-full object-cover" /> : c.author_id?.name?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-1.5 mb-1">
                              <span className="text-[11px] font-bold text-foreground">{c.author_id?.name}</span>
                              <span className="text-[9px] text-muted/40">{new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                            </div>
                            <div className="text-[12px] text-foreground/70 leading-relaxed whitespace-pre-wrap bg-muted/5 border border-muted/8 rounded-xl rounded-tl-none px-3 py-2">
                              {c.content}
                            </div>
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              {c.reactions?.map((r: any) => (
                                <button key={r.emoji} onClick={() => toggleReaction(c._id, r.emoji)}
                                  className={`px-1.5 py-0.5 rounded-full text-[10px] flex items-center gap-0.5 transition-colors ${r.users.includes(currentUserId) ? "bg-cyan/15 text-cyan border border-cyan/20" : "bg-muted/8 text-muted border border-transparent hover:border-muted/15"}`}>
                                  {r.emoji} <span>{r.users.length}</span>
                                </button>
                              ))}
                              <button onClick={() => toggleReaction(c._id, "👍")} className="text-muted/30 hover:text-muted/60 text-[10px] transition-colors"><Smile size={10} /></button>
                              <button onClick={() => setReplyingTo(c)} className="text-muted/30 hover:text-cyan text-[10px] flex items-center gap-0.5 transition-colors ml-0.5"><CornerDownRight size={9} /> Reply</button>
                            </div>
                          </div>
                        </div>

                        {/* Replies */}
                        {comments.filter(rc => rc.parent_id === c._id).map(rc => (
                          <div key={rc._id} className="flex gap-2 ml-8 relative pt-0.5">
                            <div className="absolute -left-4 top-3 w-3 border-b border-l border-muted/15 rounded-bl h-6 -translate-y-5" />
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet/25 to-cyan/25 flex items-center justify-center text-[6px] font-bold text-white shrink-0 overflow-hidden mt-0.5">
                              {rc.author_id?.avatar ? <img src={rc.author_id.avatar} alt="" className="w-full h-full object-cover" /> : rc.author_id?.name?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-1 mb-0.5">
                                <span className="text-[10px] font-bold text-foreground">{rc.author_id?.name}</span>
                                <span className="text-[8px] text-muted/35">{new Date(rc.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                              </div>
                              <div className="text-[11px] text-foreground/65 leading-relaxed whitespace-pre-wrap bg-muted/5 border border-muted/8 rounded-xl rounded-tl-none px-2.5 py-1.5">{rc.content}</div>
                              <div className="flex items-center gap-1 mt-1">
                                {rc.reactions?.map((r: any) => (
                                  <button key={r.emoji} onClick={() => toggleReaction(rc._id, r.emoji)}
                                    className={`px-1 py-0.5 rounded-full text-[9px] flex items-center gap-0.5 ${r.users.includes(currentUserId) ? "bg-cyan/15 text-cyan" : "bg-muted/8 text-muted"} hover:bg-muted/15 transition-colors`}>
                                    {r.emoji} <span>{r.users.length}</span>
                                  </button>
                                ))}
                                <button onClick={() => toggleReaction(rc._id, "👍")} className="text-muted/25 hover:text-muted/50 transition-colors"><Smile size={9} /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Comment composer */}
                  <div className="p-3 border-t border-muted/8 relative">
                    {replyingTo && (
                      <div className="flex items-center justify-between bg-cyan/5 border border-cyan/15 px-2.5 py-1.5 text-[10px] font-medium text-cyan rounded-lg mb-2">
                        <span className="flex items-center gap-1"><CornerDownRight size={9} /> Replying to {replyingTo.author_id?.name}</span>
                        <button onClick={() => setReplyingTo(null)} className="hover:text-foreground"><X size={9} /></button>
                      </div>
                    )}
                    {mentionQuery?.active && (
                      <div className="absolute bottom-full left-3 mb-2 bg-surface border border-muted/10 rounded-xl shadow-2xl w-52 overflow-hidden z-20 max-h-44 overflow-y-auto">
                        <div className="px-3 py-1.5 border-b border-muted/5 text-[9px] font-bold uppercase tracking-wider text-muted/40 bg-muted/5">Mentions</div>
                        {users.filter(u => u.name.toLowerCase().includes(mentionQuery.text.toLowerCase())).map(u => (
                          <button key={u._id} onClick={() => handleSelectMention(u)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted/5 transition-colors text-left font-medium">
                            <div className="w-4 h-4 rounded-full bg-cyan/20 flex shrink-0 items-center justify-center text-[6px] text-cyan overflow-hidden"><AtSign size={7} /></div>
                            {u.name}
                          </button>
                        ))}
                        {users.filter(u => u.name.toLowerCase().includes(mentionQuery.text.toLowerCase())).length === 0 && (
                          <div className="px-3 py-3 text-xs text-muted/40 text-center">No users found</div>
                        )}
                      </div>
                    )}
                    <form onSubmit={e => { e.preventDefault(); handlePostComment(); }} className="relative">
                      <textarea
                        value={newComment}
                        onChange={handleCommentChange}
                        placeholder="Leave a comment… (@ to mention)"
                        rows={2}
                        className="w-full bg-muted/5 border border-muted/10 rounded-xl text-[12px] text-foreground placeholder:text-muted/30 p-3 pr-9 resize-none focus:outline-none focus:border-muted/25 transition-colors"
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePostComment(); } }}
                      />
                      <button type="submit" disabled={postingComment || !newComment.trim()}
                        className="absolute right-2.5 bottom-2.5 p-1.5 bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-25 transition-all">
                        {postingComment ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                      </button>
                    </form>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Delete confirm overlay */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteConfirm(false)} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }} transition={spring}
                  className="relative bg-surface border border-red-500/15 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                  <div className="flex items-start gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-red-500/8 border border-red-500/15 flex items-center justify-center shrink-0">
                      <Trash2 size={15} className="text-red-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground mb-1">Delete task?</h3>
                      <p className="text-xs text-muted leading-relaxed">
                        "<span className="text-foreground font-medium">{task?.title}</span>" and all nested subtasks will be permanently removed.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-xs text-muted hover:text-foreground transition-colors font-semibold">Cancel</button>
                    <button onClick={executeDelete} disabled={deletingTask}
                      className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 disabled:opacity-50 flex items-center gap-1.5 transition-colors">
                      {deletingTask ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      Delete permanently
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
