"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid, List, Plus, Search, Loader2, Lock,
  CheckCircle2, Clock, CircleDashed, Eye, ChevronRight,
  Layers, FileText, X, AlertTriangle, Sparkles, Menu
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
    "gray": "#6b7280",
  };
  return map[color] || "#6b7280";
}

// ─── Admin Approval Screen ─────────────────────────────────────────────────────
function ApprovalScreen({ page, onApprove, onReject }: { page: any; onApprove: () => void; onReject: () => void }) {
  const [loading, setLoading] = useState<null | "approve" | "reject">(null);

  const handleApprove = async () => {
    setLoading("approve");
    const res = await fetch(`/api/pages/${page._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approval_status: "APPROVED" }),
    });
    if ((await res.json()).success) onApprove();
    setLoading(null);
  };

  const handleReject = async () => {
    setLoading("reject");
    const res = await fetch(`/api/pages/${page._id}`, { method: "DELETE" });
    if ((await res.json()).success) onReject();
    setLoading(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
        <Lock size={24} className="text-amber-500" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold text-foreground">"{page.name}" is Pending</h2>
        <p className="text-sm text-muted max-w-xs">Review and approve this project request to allow the team to start adding tasks.</p>
        {page.description && (
          <p className="text-sm text-muted/80 max-w-sm bg-surface border border-muted/10 rounded-xl p-4 italic mt-3">
            "{page.description}"
          </p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={handleApprove} disabled={!!loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-sm hover:bg-emerald-500/20 transition-all disabled:opacity-50"
        >
          {loading === "approve" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          Approve Project
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={handleReject} disabled={!!loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm hover:bg-red-500/20 transition-all disabled:opacity-50"
        >
          {loading === "reject" ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
          Reject & Delete
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const { data: session } = useSession();
  const isAdmin =
    (session?.user as any)?.role?.level === "ADMIN" ||
    (session?.user as any)?.userType === "SUPER_ADMIN";

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"KANBAN" | "LIST">("KANBAN");

  const [boards, setBoards] = useState<any[]>([]);
  const [expandedBoards, setExpandedBoards] = useState<Set<string>>(new Set());
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<any | null>(null);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Inline task creation
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Modals
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [isRequestPageOpen, setIsRequestPageOpen] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageDesc, setNewPageDesc] = useState("");

  // ── Fetchers ──────────────────────────────────────────────────────────────────
  const fetchBoards = useCallback(async () => {
    const res = await fetch("/api/boards");
    const json = await res.json();
    if (json.success && json.data.length > 0) {
      setBoards(json.data);
      const firstId = json.data[0]._id;
      setSelectedBoardId(firstId);
      setExpandedBoards(new Set([firstId]));
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/team?limit=100");
    const json = await res.json();
    if (json.success && Array.isArray(json.data?.users)) setUsers(json.data.users);
  }, []);

  const fetchPages = useCallback(async (boardId: string) => {
    const res = await fetch(`/api/pages?boardId=${boardId}`);
    const json = await res.json();
    if (json.success) {
      setPages(json.data);
      const firstApproved = json.data.find((p: any) => p.approval_status === "APPROVED");
      const first = firstApproved || json.data[0] || null;
      setSelectedPageId(first?._id || null);
      setSelectedPage(first);
    }
  }, []);

  const fetchTasks = useCallback(async (boardId: string, pageId: string) => {
    setLoading(true);
    const res = await fetch(`/api/tasks?boardId=${boardId}&pageId=${pageId}`);
    const json = await res.json();
    if (json.success) setTasks(json.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBoards(); fetchUsers(); }, [fetchBoards, fetchUsers]);
  useEffect(() => { if (selectedBoardId) fetchPages(selectedBoardId); }, [selectedBoardId, fetchPages]);
  useEffect(() => {
    if (selectedBoardId && selectedPageId && selectedPage?.approval_status === "APPROVED") {
      fetchTasks(selectedBoardId, selectedPageId);
    } else if (selectedPage?.approval_status !== "APPROVED") {
      setTasks([]);
      setLoading(false);
    }
  }, [selectedBoardId, selectedPageId, selectedPage, fetchTasks]);

  const handleSelectPage = (page: any) => {
    setSelectedPageId(page._id);
    setSelectedPage(page);
    setSidebarOpen(false); // close mobile sidebar on selection
  };

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newBoardName.trim(), members: users.map(u => u._id) }),
    });
    const json = await res.json();
    if (json.success) {
      setBoards(prev => [...prev, json.data]);
      setSelectedBoardId(json.data._id);
      setExpandedBoards(prev => new Set([...prev, json.data._id]));
      setNewBoardName(""); setIsCreateBoardOpen(false);
    }
  };

  const handleRequestPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageName.trim() || !selectedBoardId) return;
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPageName.trim(), description: newPageDesc.trim(), board_id: selectedBoardId }),
    });
    const json = await res.json();
    if (json.success) {
      setPages(prev => [...prev, json.data]);
      setNewPageName(""); setNewPageDesc(""); setIsRequestPageOpen(false);
    }
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
    setSelectedPageId(next?._id || null);
    setSelectedPage(next);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedBoardId || !selectedPageId) return;
    setIsCreating(true);
    const board = boards.find(b => b._id === selectedBoardId);
    const defaultStatus = board?.statuses?.[0]?.name || "TODO";
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTaskTitle, board_id: selectedBoardId, page_id: selectedPageId, status: defaultStatus }),
    });
    const json = await res.json();
    if (json.success) { setTasks(prev => [json.data, ...prev]); setNewTaskTitle(""); }
    setIsCreating(false);
  };

  const handleTaskUpdated = (updatedTask: any) => {
    if (updatedTask.deleted) {
      setTasks(prev => prev.filter(t => String(t._id) !== String(updatedTask._id)));
    } else {
      setTasks(prev => prev.map(t => String(t._id) === String(updatedTask._id) ? updatedTask : t));
    }
  };

  const activeStatuses = boards.find(b => b._id === selectedBoardId)?.statuses || [];
  const filteredTasks = tasks.filter(t =>
    !t.parent_task_id && (!search || t.title.toLowerCase().includes(search.toLowerCase()))
  );
  const isPendingPage = selectedPage?.approval_status === "PENDING";
  const pendingCount = pages.filter(p => p.approval_status === "PENDING").length;

  // ── Sidebar content (shared between desktop and mobile drawer) ────────────────
  const SidebarContent = () => (
    <>
      <div className="px-4 py-3 border-b border-muted/10 flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted/60">Workspaces</span>
        <div className="flex items-center gap-1">
          {isAdmin && (
            <button
              onClick={() => setIsCreateBoardOpen(true)}
              className="p-1 rounded-lg hover:bg-muted/10 text-muted/50 hover:text-foreground transition-colors"
              title="New Board"
            >
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
                  setExpandedBoards(prev => {
                    const n = new Set(prev);
                    isExpanded ? n.delete(board._id) : n.add(board._id);
                    return n;
                  });
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${isActiveBrd ? "bg-muted/10 text-foreground" : "text-muted hover:text-foreground hover:bg-muted/5"}`}
              >
                <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
                  <ChevronRight size={11} className="shrink-0" />
                </motion.div>
                <Layers size={12} className="shrink-0 text-violet" />
                <span className="flex-1 text-left truncate">{board.name}</span>
                {isAdmin && pendingCount > 0 && isActiveBrd && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isExpanded && isActiveBrd && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={spring}
                    className="overflow-hidden ml-4 pl-2 border-l border-muted/10 mt-0.5 mb-0.5 space-y-0.5"
                  >
                    {pages.map(page => {
                      const isPending = page.approval_status === "PENDING";
                      const isActivePg = selectedPageId === page._id;
                      const canClick = isAdmin || !isPending;
                      return (
                        <div key={page._id} className="relative group/page">
                          <button
                            onClick={() => canClick && handleSelectPage(page)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                              isActivePg
                                ? "bg-violet/10 text-violet font-semibold"
                                : isPending
                                ? "text-amber-500/70 cursor-not-allowed"
                                : "text-muted hover:text-foreground hover:bg-muted/5"
                            } ${!canClick ? "pointer-events-none" : ""}`}
                          >
                            <FileText size={11} className="shrink-0" />
                            <span className="flex-1 text-left truncate">{page.name}</span>
                            {isPending && isAdmin && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold animate-pulse">
                                Review
                              </span>
                            )}
                            {isPending && !isAdmin && <Lock size={10} className="text-amber-500/60 animate-pulse" />}
                          </button>
                          {isPending && !isAdmin && (
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 hidden group-hover/page:block pointer-events-none">
                              <div className="bg-surface border border-muted/15 rounded-lg px-2.5 py-1.5 text-[10px] text-foreground shadow-xl whitespace-nowrap">
                                Pending Admin Approval
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <button
                      onClick={() => setIsRequestPageOpen(true)}
                      className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-muted/60 hover:text-muted hover:bg-muted/5 transition-all border border-dashed border-muted/20 hover:border-muted/30 mt-1"
                    >
                      <Plus size={10} />
                      {isAdmin ? "New Project" : "Request Project"}
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

      {/* ── MOBILE SIDEBAR OVERLAY ────────────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={spring}
              className="fixed top-0 left-0 bottom-0 z-50 w-64 bg-surface border-r border-muted/10 flex flex-col sm:hidden shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── DESKTOP SIDEBAR ───────────────────────────────────────────────────── */}
      <aside className="hidden sm:flex w-56 lg:w-64 shrink-0 flex-col border-r border-muted/10 bg-surface overflow-hidden">
        <SidebarContent />
      </aside>

      {/* ── MAIN ──────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-muted/10 bg-surface/80 backdrop-blur-md gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile hamburger */}
            <button onClick={() => setSidebarOpen(true)} className="sm:hidden p-1.5 rounded-lg hover:bg-muted/10 text-muted shrink-0">
              <Menu size={16} />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground flex items-center gap-1.5 truncate">
                {selectedPage ? (
                  <>
                    <span className="text-muted hidden sm:inline truncate max-w-[80px]">
                      {boards.find(b => b._id === selectedBoardId)?.name}
                    </span>
                    <ChevronRight size={11} className="text-muted/40 hidden sm:inline shrink-0" />
                    <span className="truncate max-w-[120px] sm:max-w-none">{selectedPage.name}</span>
                    {isPendingPage && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold shrink-0">
                        PENDING
                      </span>
                    )}
                  </>
                ) : "Tasks"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative hidden sm:block">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/50" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="bg-muted/5 border border-muted/15 rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted/40 focus:outline-none focus:border-violet/40 w-40 lg:w-48 transition-all"
              />
            </div>
            <div className="flex items-center bg-muted/5 border border-muted/10 rounded-xl p-0.5 gap-0.5">
              <button onClick={() => setView("KANBAN")} className={`p-1.5 rounded-[9px] transition-colors ${view === "KANBAN" ? "bg-violet/15 text-violet" : "text-muted hover:text-foreground"}`}>
                <LayoutGrid size={13} />
              </button>
              <button onClick={() => setView("LIST")} className={`p-1.5 rounded-[9px] transition-colors ${view === "LIST" ? "bg-violet/15 text-violet" : "text-muted hover:text-foreground"}`}>
                <List size={13} />
              </button>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">

          {isPendingPage ? (
            isAdmin ? (
              <ApprovalScreen page={selectedPage} onApprove={handleApproveProject} onReject={handleRejectProject} />
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center gap-3 text-muted p-8">
                <Lock size={32} className="text-amber-500/40" />
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">This project is awaiting admin approval.</p>
                <p className="text-xs text-muted/60">You'll be notified when it's approved.</p>
              </motion.div>
            )
          ) : (
            <>
              {/* New task bar */}
              {selectedPageId && (
                <div className="shrink-0 px-4 pt-3 pb-2">
                  <form onSubmit={handleCreateTask} className="flex items-center gap-2 max-w-lg">
                    <input
                      value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                      placeholder="+ Add a task…"
                      className="flex-1 bg-muted/5 border border-muted/15 rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-violet/40 transition-all"
                    />
                    <button disabled={isCreating || !newTaskTitle.trim()} className="p-2 bg-violet rounded-xl hover:bg-violet/80 transition-colors disabled:opacity-40 shrink-0">
                      {isCreating ? <Loader2 size={15} className="animate-spin text-white" /> : <Plus size={15} className="text-white" />}
                    </button>
                  </form>
                </div>
              )}

              {/* Board */}
              <div className="flex-1 overflow-x-auto overflow-y-auto no-scrollbar p-4 pt-2">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 size={22} className="animate-spin text-violet" />
                  </div>
                ) : view === "KANBAN" ? (
                  <div className="flex gap-4 h-full pb-4" style={{ minWidth: `${activeStatuses.length * 280}px` }}>
                    {activeStatuses.map((col: any) => {
                      const Icon = STATUS_ICONS[col.name] || CircleDashed;
                      const hex = statusColor(col.color);
                      const colTasks = filteredTasks.filter(t => (t.status || "TODO") === col.name);
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
                                <motion.div
                                  key={t._id}
                                  layout
                                  layoutId={String(t._id)}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  transition={spring}
                                  onClick={() => setSelectedTaskId(String(t._id))}
                                  className="bg-surface border border-muted/10 rounded-xl p-3.5 cursor-pointer hover:border-violet/30 hover:shadow-sm transition-all group"
                                >
                                  <h4 className="text-[13px] font-semibold text-foreground group-hover:text-violet transition-colors mb-3 leading-snug">{t.title}</h4>
                                  <div className="flex items-center justify-between">
                                    <div className="flex -space-x-1.5">
                                      {t.assignee_ids?.slice(0, 3).map((a: any, i: number) => (
                                        <div key={i} title={a.name} className="w-5 h-5 rounded-full border border-surface bg-gradient-to-br from-violet/40 to-cyan/40 flex items-center justify-center text-[7px] font-bold text-white overflow-hidden">
                                          {a.avatar ? <img src={a.avatar} alt="" className="w-full h-full object-cover" /> : a.name?.[0]}
                                        </div>
                                      ))}
                                    </div>
                                    {t.due_date && (
                                      <span className="text-[10px] text-muted flex items-center gap-1">
                                        <Clock size={9} />
                                        {new Date(t.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                      </span>
                                    )}
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="max-w-3xl space-y-1.5">
                    {filteredTasks.map(t => {
                      const tStatus = activeStatuses.find((s: any) => s.name === t.status);
                      const hex = tStatus ? statusColor(tStatus.color) : "#6b7280";
                      return (
                        <motion.div
                          key={String(t._id)} layout
                          onClick={() => setSelectedTaskId(String(t._id))}
                          className="flex items-center gap-3 px-4 py-3 bg-surface border border-muted/10 rounded-xl hover:border-violet/25 cursor-pointer transition-all group"
                        >
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                          <span className="text-[10px] font-bold uppercase tracking-wider w-20 shrink-0 truncate" style={{ color: hex }}>{t.status}</span>
                          <h4 className="flex-1 text-sm font-medium text-foreground group-hover:text-violet transition-colors truncate">{t.title}</h4>
                          {t.due_date && <span className="text-[10px] text-muted hidden sm:block">{new Date(t.due_date).toLocaleDateString()}</span>}
                        </motion.div>
                      );
                    })}
                    {filteredTasks.length === 0 && !loading && (
                      <div className="text-center py-16 text-muted text-sm">No tasks yet. Add one above!</div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* ── MODALS ─────────────────────────────────────────────────────────────── */}

      {/* Create Board */}
      <AnimatePresence>
        {isCreateBoardOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreateBoardOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }} transition={spring} className="relative bg-surface border border-muted/15 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-violet/10 border border-violet/20 flex items-center justify-center">
                  <Layers size={14} className="text-violet" />
                </div>
                <h3 className="text-base font-bold text-foreground">New Board</h3>
              </div>
              <form onSubmit={handleCreateBoard} className="space-y-4">
                <input autoFocus value={newBoardName} onChange={e => setNewBoardName(e.target.value)} placeholder="Board name…" className="w-full bg-muted/5 border border-muted/15 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-violet/40" />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setIsCreateBoardOpen(false)} className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors">Cancel</button>
                  <button type="submit" disabled={!newBoardName.trim()} className="px-5 py-2 bg-violet text-white text-sm font-bold rounded-xl hover:bg-violet/80 disabled:opacity-40 transition-colors">Create</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Request/Create Project */}
      <AnimatePresence>
        {isRequestPageOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRequestPageOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }} transition={spring} className="relative bg-surface border border-muted/15 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
                  {isAdmin ? <FileText size={14} className="text-emerald-600 dark:text-emerald-400" /> : <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">{isAdmin ? "New Project" : "Request Project"}</h3>
                  {!isAdmin && <p className="text-[10px] text-muted mt-0.5">Will be sent to Admin for approval</p>}
                </div>
              </div>
              <form onSubmit={handleRequestPage} className="space-y-3">
                <input autoFocus value={newPageName} onChange={e => setNewPageName(e.target.value)} placeholder="Project name…" className="w-full bg-muted/5 border border-muted/15 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-violet/40" />
                {!isAdmin && (
                  <textarea value={newPageDesc} onChange={e => setNewPageDesc(e.target.value)} placeholder="Why do you need this project? (optional)" rows={3} className="w-full bg-muted/5 border border-muted/15 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-violet/40 resize-none" />
                )}
                <div className="flex gap-2 justify-end pt-1">
                  <button type="button" onClick={() => setIsRequestPageOpen(false)} className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors">Cancel</button>
                  <button type="submit" disabled={!newPageName.trim()} className="px-5 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-500 disabled:opacity-40 transition-colors">
                    {isAdmin ? "Create" : "Send Request"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Task Modal */}
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
