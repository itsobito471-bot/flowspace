"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  FileText,
  Tag,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
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

export default function EmployeeOvertimeList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 450);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data, error, isLoading } = useSWR(
    `/api/time-logs?search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=${limit}`,
    fetcher
  );

  const logs = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

  // Calculate quick metrics for the current page — only count overtime-flagged logs
  const approvedHours = logs
    .filter((l: any) => l.is_billable_overtime === true && l.approval_status === "APPROVED")
    .reduce((sum: number, l: any) => sum + l.duration_seconds, 0) / 3600;

  const pendingHours = logs
    .filter((l: any) => l.is_billable_overtime === true && l.approval_status === "PENDING")
    .reduce((sum: number, l: any) => sum + l.duration_seconds, 0) / 3600;

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">My Time Logs</h2>
          <p className="text-xs text-muted">All your tracked work sessions. Overtime submissions show their approval status below.</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-background border border-muted/10 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Total Sessions</span>
          <span className="text-xl font-bold text-foreground mt-2">{pagination.total}</span>
        </div>
        <div className="bg-background border border-muted/10 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">OT Approved (Page)</span>
          <span className="text-xl font-bold text-emerald-500 mt-2">{approvedHours.toFixed(1)} hrs</span>
        </div>
        <div className="bg-background border border-muted/10 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">OT Pending (Page)</span>
          <span className="text-xl font-bold text-amber-500 mt-2">{pendingHours.toFixed(1)} hrs</span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:max-w-md flex items-center bg-background border border-muted/15 focus-within:border-cyan/30 rounded-xl px-3.5 py-2 transition-colors">
          <Search size={14} className="text-muted mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search by notes or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-foreground placeholder:text-muted/40 focus:outline-none w-full min-w-0"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-muted hover:text-foreground transition-colors p-0.5"
            >
              <XCircle size={12} />
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

      {/* Main List */}
      <div className="bg-surface border border-muted/10 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex justify-center items-center py-20 flex-col gap-3">
            <Loader2 className="animate-spin text-cyan" size={24} />
            <span className="text-xs text-muted">Loading overtime logs...</span>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center py-16 text-red-400 gap-2">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">Failed to load overtime logs.</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center text-sm text-muted flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted/5 flex items-center justify-center text-muted">
              <Clock size={20} />
            </div>
            <span>No overtime logs found.</span>
          </div>
        ) : (
          <div className="divide-y divide-muted/10">
            {logs.map((log: any) => {
              const isOvertime = log.is_billable_overtime === true;
              const isApproved = isOvertime && log.approval_status === "APPROVED";
              const isRejected = isOvertime && log.approval_status === "REJECTED";
              const isPending = isOvertime && log.approval_status === "PENDING";

              return (
                <div
                  key={log._id}
                  className="p-5 flex flex-col gap-4 hover:bg-muted/5 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Log Details */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap text-xs text-muted">
                        <Clock size={12} className="text-[#00E8D2] shrink-0" />
                        <span className="font-bold text-foreground">
                          {formatDuration(log.duration_seconds)}
                        </span>
                        <span className="opacity-50">•</span>
                        <span>
                          {new Date(log.start_time).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
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
                        {log.tags?.map((tag: string) => (
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

                    {/* Status Badge */}
                     <div className="shrink-0 self-start md:self-center flex flex-col items-end gap-1.5">
                      {/* Overtime marker */}
                      {isOvertime && (
                        <span className="text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded-md">OT</span>
                      )}
                      {isApproved && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold">
                          <CheckCircle size={14} />
                          <span>OT Approved</span>
                        </div>
                      )}
                      {isPending && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-xs font-semibold animate-pulse">
                          <Clock size={14} />
                          <span>Pending Approval</span>
                        </div>
                      )}
                      {isRejected && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-semibold">
                          <XCircle size={14} />
                          <span>OT Rejected</span>
                        </div>
                      )}
                      {!isOvertime && (
                        <span className="text-[10px] text-muted">Regular</span>
                      )}
                    </div>
                  </div>

                  {/* Rejection comment display */}
                  {isRejected && log.rejection_comment && (
                    <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-xs text-red-400/90 flex items-start gap-2.5">
                      <MessageSquare size={14} className="shrink-0 mt-0.5 text-red-500" />
                      <div>
                        <span className="font-bold block mb-0.5">Admin Comment:</span>
                        <p className="leading-relaxed">{log.rejection_comment}</p>
                      </div>
                    </div>
                  )}
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
    </div>
  );
}
