"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  Clock,
  User as UserIcon,
  FileText,
  Tag,
  Coins,
  Loader2,
  AlertCircle,
  CheckCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Helper to format seconds to human-readable duration (e.g., 2h 15m)
const formatDuration = (totalSeconds: number): string => {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const parts = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
};

export default function OvertimeApprovals() {
  // Search & Pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Rejection modal states
  const [rejectLogId, setRejectLogId] = useState<string | null>(null);
  const [rejectionComment, setRejectionComment] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset page to 1 when search changes
    }, 450);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data, error, isLoading, mutate } = useSWR(
    `/api/time-logs?pendingOvertime=true&search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=${limit}`,
    fetcher
  );

  const logs = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

  const handleAction = async (id: string, status: "APPROVED" | "REJECTED", comment?: string) => {
    setProcessingId(id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/time-logs/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          approval_status: status,
          rejection_comment: comment 
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setFeedback({
        type: "success",
        message: `Overtime log successfully ${status.toLowerCase()}!`,
      });

      // Optimistically update lists
      mutate();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to update time log.",
      });
    } finally {
      setProcessingId(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const openRejectModal = (id: string) => {
    setRejectLogId(id);
    setRejectionComment("");
    setModalError(null);
  };

  const closeRejectModal = () => {
    setRejectLogId(null);
    setRejectionComment("");
    setModalError(null);
  };

  const confirmRejection = async () => {
    if (!rejectionComment.trim()) {
      setModalError("Please provide a reason for the rejection.");
      return;
    }
    if (!rejectLogId) return;

    const logId = rejectLogId;
    closeRejectModal();
    await handleAction(logId, "REJECTED", rejectionComment.trim());
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Overtime Approvals</h2>
          <p className="text-xs text-muted">Review and approve tracked time logs submitted as billable overtime.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <Coins size={12} />
            <span>{pagination.total} Pending</span>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:max-w-md flex items-center bg-background border border-muted/15 focus-within:border-cyan/30 rounded-xl px-3.5 py-2 transition-colors">
          <Search size={14} className="text-muted mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search by employee name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-foreground placeholder:text-muted/40 focus:outline-none w-full min-w-0"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-muted hover:text-foreground transition-colors p-0.5"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Limit Selector */}
        <div className="flex items-center gap-2 ml-auto shrink-0 select-none">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Per Page:</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="bg-background border border-muted/15 rounded-xl px-2.5 py-1.5 text-xs text-foreground font-semibold focus:outline-none cursor-pointer"
          >
            {[5, 10, 20, 50].map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Feedback Banner */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            {feedback.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            <span>{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main List */}
      <div className="bg-surface border border-muted/10 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex justify-center items-center py-20 flex-col gap-3">
            <Loader2 className="animate-spin text-cyan" size={24} />
            <span className="text-xs text-muted">Loading overtime approvals...</span>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center py-16 text-red-400 gap-2">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">Failed to load approvals.</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center text-sm text-muted flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted/5 flex items-center justify-center text-muted">
              <Clock size={20} />
            </div>
            <span>No pending overtime approvals found.</span>
          </div>
        ) : (
          <div className="divide-y divide-muted/10">
            {logs.map((log: any) => {
              const userInitials = log.user_id?.name
                ? log.user_id.name.split(" ").map((n: any) => n[0]).join("").toUpperCase().slice(0, 2)
                : "U";

              return (
                <div
                  key={log._id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/5 transition-colors"
                >
                  {/* User Profile & Task Info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {log.user_id?.avatar ? (
                      <img
                        src={log.user_id.avatar}
                        alt={log.user_id.name}
                        className="w-10 h-10 rounded-full object-cover border border-muted/10 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan/40 to-violet/40 border border-cyan/20 flex items-center justify-center text-sm font-bold text-white shrink-0">
                        {userInitials}
                      </div>
                    )}
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {log.user_id?.name || "Unknown User"}
                        </span>
                        <span className="text-[10px] text-muted truncate">
                          ({log.user_id?.email})
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted flex-wrap">
                        <Clock size={12} className="text-[#00E8D2] shrink-0" />
                        <span className="font-bold text-foreground">
                          {formatDuration(log.duration_seconds)}
                        </span>
                        <span className="opacity-50">•</span>
                        <span>
                          {new Date(log.start_time).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span>
                          {new Date(log.start_time).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {" - "}
                          {new Date(log.end_time).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Notes */}
                      {log.notes && (
                        <div className="flex items-start gap-1.5 text-xs text-muted pt-1">
                          <FileText size={12} className="shrink-0 mt-0.5" />
                          <p className="italic leading-normal break-words">{log.notes}</p>
                        </div>
                      )}

                      {/* Linked Task & Tags */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {log.task_id?.title ? (
                          <span className="text-[10px] bg-cyan/10 text-cyan border border-cyan/20 rounded-md px-2 py-0.5 font-semibold">
                            Task: {log.task_id.title}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-muted/10 text-muted rounded-md px-2 py-0.5 font-semibold">
                            No Task Linked
                          </span>
                        )}
                        {log.tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="text-[10px] flex items-center gap-0.5 bg-violet/10 text-violet border border-violet/20 rounded-md px-2 py-0.5 font-semibold"
                          >
                            <Tag size={8} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Approve/Reject Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => openRejectModal(log._id)}
                      disabled={processingId !== null}
                      className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 disabled:opacity-50 font-semibold px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer"
                      title="Reject Overtime"
                    >
                      {processingId === log._id ? (
                        <Loader2 className="animate-spin" size={12} />
                      ) : (
                        <X size={12} />
                      )}
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleAction(log._id, "APPROVED")}
                      disabled={processingId !== null}
                      className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 font-semibold px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer"
                      title="Approve Overtime"
                    >
                      {processingId === log._id ? (
                        <Loader2 className="animate-spin" size={12} />
                      ) : (
                        <Check size={12} />
                      )}
                      <span>Approve</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!isLoading && !error && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-muted/10 pt-4 select-none">
          <span className="text-xs text-muted">
            Showing Page <strong className="text-foreground">{pagination.page}</strong> of{" "}
            <strong className="text-foreground">{pagination.totalPages}</strong> ({pagination.total} total logs)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page === 1}
              className="p-1.5 rounded-lg border border-muted/20 text-muted hover:text-foreground disabled:opacity-40 transition-colors disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page === pagination.totalPages}
              className="p-1.5 rounded-lg border border-muted/20 text-muted hover:text-foreground disabled:opacity-40 transition-colors disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Rejection Comment Modal */}
      <AnimatePresence>
        {rejectLogId && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeRejectModal}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="bg-surface border border-muted/15 rounded-2xl w-full max-w-md shadow-2xl p-6 pointer-events-auto text-slate-800 dark:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between pb-4 border-b border-muted/10">
                  <div className="flex items-center gap-2 text-red-500">
                    <MessageSquare size={18} />
                    <h3 className="font-bold text-sm">Provide Rejection Reason</h3>
                  </div>
                  <button
                    onClick={closeRejectModal}
                    className="text-muted hover:text-foreground transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {modalError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle size={14} />
                      <span>{modalError}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted">
                    Please explain why this overtime request is being rejected. The employee will see this comment.
                  </p>
                  <textarea
                    rows={4}
                    value={rejectionComment}
                    onChange={(e) => {
                      setRejectionComment(e.target.value);
                      if (e.target.value.trim()) setModalError(null);
                    }}
                    placeholder="Enter reason for rejection..."
                    className="w-full bg-background border border-muted/25 focus:border-red-500 rounded-xl p-3 text-xs text-foreground focus:outline-none transition-all resize-none placeholder:text-muted/30"
                  />
                </div>

                <div className="mt-6 pt-4 border-t border-muted/10 flex items-center justify-end gap-3">
                  <button
                    onClick={closeRejectModal}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-muted border border-muted/20 hover:bg-muted/5 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRejection}
                    className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 font-bold rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <X size={14} />
                    <span>Reject Request</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
