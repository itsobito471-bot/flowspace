"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Loader2,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Ban,
  FileText,
  CalendarDays,
  Coins,
  Tag,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────
interface LeaveUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  employee_id?: string;
}

interface LeaveRequest {
  _id: string;
  user_id: LeaveUser;
  leave_type: string; // NEW: The categorized leave type
  start_date: string;
  end_date: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  is_loss_of_pay: boolean;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

// NEW: Categorized Balance Types
interface CategoryBalance {
  type: string;
  quota: number;
  used_days: number;
  pending_days: number;
  remaining: number;
}

interface UserBalanceData {
  year: number;
  balances: CategoryBalance[];
}

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────
function daysBetween(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const STATUS_STYLES = {
  PENDING: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_ICON = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

// ─────────────────────────────────────────────────────────────────────────────
//  Pagination Bar
// ─────────────────────────────────────────────────────────────────────────────
function PaginationBar({
  page, totalPages, totalCount, limit, onPrev, onNext,
}: {
  page: number; totalPages: number; totalCount: number; limit: number;
  onPrev: () => void; onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, totalCount);
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-muted/10">
      <span className="text-[11px] text-muted">
        Showing <span className="text-foreground font-semibold">{from}–{to}</span> of{" "}
        <span className="text-foreground font-semibold">{totalCount}</span>
      </span>
      <div className="flex items-center gap-1.5">
        <button onClick={onPrev} disabled={page <= 1}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted border border-muted/15 hover:border-cyan/30 hover:text-cyan disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronLeft size={12} /> Prev
        </button>
        <span className="text-[11px] text-muted px-2">Page {page} of {totalPages}</span>
        <button onClick={onNext} disabled={page >= totalPages}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted border border-muted/15 hover:border-cyan/30 hover:text-cyan disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          Next <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Request Leave Modal
// ─────────────────────────────────────────────────────────────────────────────
function RequestLeaveModal({ open, onClose, onCreated, balanceData }: {
  open: boolean;
  onClose: () => void;
  onCreated: (leave: LeaveRequest) => void;
  balanceData: UserBalanceData | null;
}) {
  const [form, setForm] = useState({ leave_type: "", start_date: "", end_date: "", reason: "" });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ leave_type: "", start_date: "", end_date: "", reason: "" });
    setErrors({}); setApiError(null); setSuccess(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  function validate() {
    const e: Partial<typeof form> = {};
    if (!form.leave_type) e.leave_type = "Please select a leave category";
    if (!form.start_date) e.start_date = "Required";
    if (!form.end_date) e.end_date = "Required";
    else if (form.start_date && form.end_date < form.start_date)
      e.end_date = "End date cannot be before start date";
    if (!form.reason.trim()) e.reason = "Please provide a reason";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true); setApiError(null);
    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) { setApiError(json.message); return; }
      setSuccess(true);
      onCreated(json.data);
      setTimeout(onClose, 1200);
    } catch { setApiError("Network error. Please try again."); }
    finally { setSubmitting(false); }
  }

  const inputCls =
    "w-full bg-background border border-muted/10 rounded-xl px-3.5 py-2.5 text-sm text-foreground " +
    "placeholder:text-muted/40 focus:outline-none focus:border-cyan/40 transition-all";

  const days = form.start_date && form.end_date && form.end_date >= form.start_date
    ? daysBetween(form.start_date, form.end_date)
    : null;

  // Find the currently selected balance category to show the specific progress bar
  const selectedBal = form.leave_type && balanceData?.balances
    ? balanceData.balances.find(b => b.type === form.leave_type)
    : null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="leave-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <motion.div key="leave-modal" initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md bg-surface border border-muted/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.4)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-muted/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center">
                    <Calendar size={13} className="text-cyan" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Request Leave</h2>
                    <p className="text-[10px] text-muted">Submit a leave application</p>
                  </div>
                </div>
                <button onClick={onClose} className="text-muted hover:text-foreground w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/10 transition-all">
                  <X size={15} />
                </button>
              </div>

              {/* Banners */}
              <AnimatePresence>
                {success && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    className="flex items-center gap-2.5 px-6 py-3.5 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400">
                    <CheckCircle2 size={15} />
                    <span className="text-sm font-semibold">Leave request submitted!</span>
                  </motion.div>
                )}
                {apiError && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    className="flex items-center gap-2.5 px-6 py-3.5 bg-red-500/10 border-b border-red-500/20 text-red-400">
                    <AlertCircle size={15} />
                    <span className="text-sm">{apiError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} noValidate>
                <div className="px-6 py-5 space-y-4">

                  {/* ── Dynamic Leave Selection & Banner ── */}
                  <div className="flex flex-col gap-1.5 mb-2">
                    <label className="text-[11px] font-semibold tracking-widest uppercase text-muted/80">Leave Category</label>
                    <select
                      value={form.leave_type}
                      onChange={(e) => {
                        setForm(p => ({ ...p, leave_type: e.target.value }));
                        setErrors(p => ({ ...p, leave_type: undefined }));
                      }}
                      className={inputCls + " appearance-none cursor-pointer"}
                    >
                      <option value="" disabled>Select Leave Type</option>
                      {balanceData?.balances.map(b => (
                        <option key={b.type} value={b.type} disabled={b.remaining <= 0}>
                          {b.type} ({b.remaining} days remaining)
                        </option>
                      ))}
                    </select>
                    {errors.leave_type && <p className="text-[11px] text-red-400">{errors.leave_type}</p>}
                  </div>

                  {/* Show the progress bar ONLY for the selected leave type */}
                  <AnimatePresence mode="popLayout">
                    {selectedBal && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="rounded-xl border border-muted/10 bg-muted/5 p-3.5"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold tracking-widest uppercase text-muted/70">
                            {balanceData?.year} {selectedBal.type} Balance
                          </span>
                          <span className={`text-xs font-black ${selectedBal.remaining <= 0 ? "text-red-400" :
                              selectedBal.remaining <= 3 ? "text-amber-400" : "text-emerald-400"
                            }`}>
                            {selectedBal.remaining} remaining
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted/15 rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full transition-all ${selectedBal.remaining <= 0 ? "bg-red-500" :
                                selectedBal.remaining <= 3 ? "bg-amber-400" : "bg-emerald-500"
                              }`}
                            style={{ width: `${Math.min(100, (selectedBal.used_days / selectedBal.quota) * 100)}%` }}
                          />
                        </div>
                        <div className="flex gap-4 text-[10px] text-muted">
                          <span><span className="text-foreground font-semibold">{selectedBal.used_days}</span> used</span>
                          {selectedBal.pending_days > 0 && (
                            <span><span className="text-amber-400 font-semibold">{selectedBal.pending_days}</span> pending</span>
                          )}
                          <span><span className="text-foreground font-semibold">{selectedBal.quota}</span> total quota</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold tracking-widest uppercase text-muted/80">Start Date</label>
                      <input type="date" value={form.start_date}
                        onChange={(e) => { setForm(p => ({ ...p, start_date: e.target.value })); setErrors(p => ({ ...p, start_date: undefined })); }}
                        className={inputCls} />
                      {errors.start_date && <p className="text-[11px] text-red-400">{errors.start_date}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold tracking-widest uppercase text-muted/80">End Date</label>
                      <input type="date" value={form.end_date} min={form.start_date}
                        onChange={(e) => { setForm(p => ({ ...p, end_date: e.target.value })); setErrors(p => ({ ...p, end_date: undefined })); }}
                        className={inputCls} />
                      {errors.end_date && <p className="text-[11px] text-red-400">{errors.end_date}</p>}
                    </div>
                  </div>

                  {days !== null && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border ${selectedBal && days > selectedBal.remaining
                          ? "bg-red-500/8 border-red-500/20"
                          : "bg-cyan/5 border-cyan/15"
                        }`}>
                      <div className="flex items-center gap-2">
                        <CalendarDays size={13} className={selectedBal && days > selectedBal.remaining ? "text-red-400" : "text-cyan"} />
                        <span className={`text-xs font-semibold ${selectedBal && days > selectedBal.remaining ? "text-red-400" : "text-cyan"}`}>
                          {days} day{days !== 1 ? "s" : ""} selected
                        </span>
                      </div>
                      {selectedBal && days > selectedBal.remaining && (
                        <span className="text-[10px] font-bold text-red-400">Exceeds balance by {days - selectedBal.remaining} day{days - selectedBal.remaining !== 1 ? "s" : ""}</span>
                      )}
                    </motion.div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold tracking-widest uppercase text-muted/80">Reason</label>
                    <textarea value={form.reason} rows={3}
                      onChange={(e) => { setForm(p => ({ ...p, reason: e.target.value })); setErrors(p => ({ ...p, reason: undefined })); }}
                      placeholder="Briefly describe your reason for leave..."
                      className={inputCls + " resize-none"} />
                    {errors.reason && <p className="text-[11px] text-red-400">{errors.reason}</p>}
                  </div>
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-muted/10">
                  <button type="button" onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted border border-muted/20 hover:bg-muted/5 hover:text-foreground transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting || success || (selectedBal ? days! > selectedBal.remaining : false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all">
                    {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Admin Action Modal (Approve / Reject)
// ─────────────────────────────────────────────────────────────────────────────
function AdminActionModal({ leave, action, open, onClose, onActioned }: {
  leave: LeaveRequest | null;
  action: "APPROVED" | "REJECTED" | null;
  open: boolean;
  onClose: () => void;
  onActioned: (updated: LeaveRequest) => void;
}) {
  const [lop, setLop] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [empBalance, setEmpBalance] = useState<UserBalanceData | null>(null);

  useEffect(() => {
    if (!open) { setLop(false); setApiError(null); setEmpBalance(null); return; }
    // Fetch the employee's categorized leave balances when modal opens
    if (leave?.user_id?._id) {
      fetch(`/api/leave/balance?userId=${leave.user_id._id}`)
        .then(r => r.json())
        .then(j => j.success && setEmpBalance(j.data))
        .catch(() => { });
    }
  }, [open, leave]);

  async function handleConfirm() {
    if (!leave || !action) return;
    setSubmitting(true); setApiError(null);
    try {
      const res = await fetch(`/api/leave/${leave._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action, is_loss_of_pay: lop }),
      });
      const json = await res.json();
      if (!json.success) { setApiError(json.message); return; }
      onActioned(json.data);
      onClose();
    } catch { setApiError("Network error."); }
    finally { setSubmitting(false); }
  }

  if (!leave || !action) return null;
  const isApprove = action === "APPROVED";
  const days = daysBetween(leave.start_date, leave.end_date);

  // Find specific balance for context
  const targetBal = empBalance?.balances.find(b => b.type === leave.leave_type);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="action-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <motion.div key="action-modal" initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-sm bg-surface border border-muted/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.4)] overflow-hidden p-6 text-center"
              onClick={(e) => e.stopPropagation()}>

              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${isApprove ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                {isApprove ? <Check size={20} className="text-emerald-400" /> : <Ban size={20} className="text-red-400" />}
              </div>

              <h2 className="text-base font-bold text-foreground mb-1">
                {isApprove ? "Approve Leave?" : "Reject Leave?"}
              </h2>
              <p className="text-sm text-muted mb-1">{leave.user_id.name}</p>

              <div className="flex flex-col items-center gap-1 my-3 bg-muted/5 rounded-xl border border-muted/10 py-2.5">
                <span className="text-[10px] uppercase tracking-widest font-bold text-cyan">{leave.leave_type || "Time Off"}</span>
                <p className="text-xs text-muted/80">
                  {fmt(leave.start_date)} – {fmt(leave.end_date)} · {days} day{days !== 1 ? "s" : ""}
                </p>
                {targetBal && (
                  <p className="text-[10px] text-muted font-semibold">
                    Remaining {leave.leave_type}: <span className={targetBal.remaining < days && isApprove ? "text-red-400" : "text-foreground"}>{targetBal.remaining} days</span>
                  </p>
                )}
              </div>

              {isApprove && (
                <button
                  onClick={() => setLop(!lop)}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold mb-4 transition-all ${lop
                      ? "bg-red-500/10 border-red-500/25 text-red-400"
                      : "border-muted/15 text-muted hover:border-muted/30 hover:text-foreground"
                    }`}>
                  <Coins size={14} />
                  Loss of Pay
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider">
                    {lop ? "YES" : "NO"}
                  </span>
                </button>
              )}

              {apiError && (
                <p className="text-sm text-red-400 flex items-center gap-1.5 justify-center mb-4">
                  <AlertCircle size={13} />{apiError}
                </p>
              )}

              <div className="flex gap-3">
                <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted border border-muted/20 hover:bg-muted/5 hover:text-foreground transition-all">
                  Cancel
                </button>
                <button onClick={handleConfirm} disabled={submitting}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all ${isApprove
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-red-500 text-white hover:bg-red-600"
                    }`}>
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : isApprove ? "Approve" : "Reject"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Leave Row Component
// ─────────────────────────────────────────────────────────────────────────────
function LeaveRow({ leave, isAdmin, onApprove, onReject }: {
  leave: LeaveRequest;
  isAdmin: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const StatusIcon = STATUS_ICON[leave.status];
  const days = daysBetween(leave.start_date, leave.end_date);

  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="group border-b border-muted/10 hover:bg-muted/5 transition-colors">
      {isAdmin && (
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan/40 to-violet/40 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {initials(leave.user_id.name)}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-none">{leave.user_id.name}</p>
              <p className="text-[11px] text-muted mt-0.5">{leave.user_id.employee_id || leave.user_id.email}</p>
            </div>
          </div>
        </td>
      )}
      <td className="px-5 py-4 min-w-[150px]">
        <div className="flex items-center gap-1.5 text-sm text-foreground">
          <CalendarDays size={13} className="text-muted shrink-0" />
          <span>{fmt(leave.start_date)}</span>
          {leave.start_date !== leave.end_date && (
            <><span className="text-muted">–</span><span>{fmt(leave.end_date)}</span></>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 ml-[21px]">
          <p className="text-[11px] text-muted">{days} day{days !== 1 ? "s" : ""}</p>
          {leave.leave_type && (
            <>
              <span className="w-1 h-1 rounded-full bg-muted/30" />
              <span className="text-[10px] uppercase font-bold text-cyan flex items-center gap-1"><Tag size={10} /> {leave.leave_type}</span>
            </>
          )}
        </div>
      </td>
      <td className="px-5 py-4 max-w-[200px]">
        <p className="text-sm text-foreground/80 truncate" title={leave.reason}>{leave.reason}</p>
      </td>
      <td className="px-5 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${STATUS_STYLES[leave.status]}`}>
          <StatusIcon size={11} />
          {leave.status}
        </span>
        {leave.is_loss_of_pay && (
          <span className="ml-1.5 text-[10px] text-red-400 font-semibold">LOP</span>
        )}
      </td>
      {isAdmin && (leave.status === "PENDING" || leave.status === "APPROVED") ? (
        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            {leave.status === "PENDING" && (
              <button onClick={onApprove}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-bold transition-all">
                <Check size={11} /> Approve
              </button>
            )}
            <button onClick={onReject}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-[11px] font-bold transition-all">
              <Ban size={11} /> {leave.status === "APPROVED" ? "Revoke" : "Reject"}
            </button>
          </div>
        </td>
      ) : (
        isAdmin && <td className="px-5 py-4" />
      )}
    </motion.tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Page
// ─────────────────────────────────────────────────────────────────────────────
type AdminTab = "pending" | "all";

function LeavePageInner() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const isAdmin = (session?.user as any)?.role?.level === "ADMIN";

  const [adminTab, setAdminTab] = useState<AdminTab>(
    (searchParams.get("tab") as AdminTab) ?? "pending"
  );

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const LIMIT = 15;

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [actionLeave, setActionLeave] = useState<LeaveRequest | null>(null);
  const [actionType, setActionType] = useState<"APPROVED" | "REJECTED" | null>(null);

  // NEW: Updated to hold the array of balances
  const [myBalance, setMyBalance] = useState<UserBalanceData | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/leave/balance");
      const json = await res.json();
      if (json.success) setMyBalance(json.data);
    } catch (e) {
      console.error("Error fetching balance:", e);
    }
  }, []);

  const fetchLeaves = useCallback(async (pg: number, tab?: AdminTab) => {
    setLoading(true);
    setError(null);
    try {
      const activeTab = tab ?? adminTab;
      const statusParam = isAdmin && activeTab === "pending" ? "&status=PENDING" : "";
      const res = await fetch(`/api/leave?page=${pg}&limit=${LIMIT}${statusParam}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setLeaves(json.data);
      setPagination(json.pagination);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, adminTab]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchLeaves(page);
      fetchBalance();
    }
  }, [status, page, fetchLeaves, fetchBalance]);

  useEffect(() => {
    const tab = searchParams.get("tab") as AdminTab;
    if (tab && tab !== adminTab) {
      setAdminTab(tab);
      setPage(1);
      fetchLeaves(1, tab);
    }
  }, [searchParams]);

  function switchTab(tab: AdminTab) {
    setAdminTab(tab);
    setPage(1);
    router.push(`/leave?tab=${tab}`);
    fetchLeaves(1, tab);
  }

  function handleActioned(updated: LeaveRequest) {
    setLeaves((prev) =>
      prev.map((l) => (l._id === updated._id ? updated : l))
        .filter((l) => !(isAdmin && adminTab === "pending" && l.status !== "PENDING"))
    );
  }

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={28} className="text-cyan animate-spin" />
      </div>
    );
  }

  return (
    <>
      <RequestLeaveModal
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        balanceData={myBalance}
        onCreated={(leave) => {
          setLeaves((prev) => [leave, ...prev]);
          fetchBalance();
        }}
      />
      <AdminActionModal
        leave={actionLeave}
        action={actionType}
        open={!!actionLeave}
        onClose={() => { setActionLeave(null); setActionType(null); }}
        onActioned={handleActioned}
      />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
        className="p-6 md:p-8 space-y-6">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={18} className="text-cyan" />
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-cyan/70">
                {isAdmin ? "Leave Management" : "Leave & Time Off"}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              {isAdmin ? "Leave Requests" : "My Leave"}
            </h1>
            <p className="text-sm text-muted mt-1">
              {isAdmin
                ? "Review and action employee leave applications."
                : "Track and manage your time-off requests."}
            </p>
          </div>
          {!isAdmin && (
            <button
              onClick={() => setRequestModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-bold tracking-tight hover:bg-foreground/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
              <Plus size={15} strokeWidth={2.5} /> Request Leave
            </button>
          )}
        </div>

        {/* ── Employee Categorized Stats Strip (Phase 4) ── */}
        {!isAdmin && myBalance?.balances && myBalance.balances.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {myBalance.balances.map(b => (
              <div key={b.type} className="bg-surface border border-muted/10 rounded-2xl px-5 py-4 flex flex-col justify-between hover:border-cyan/20 transition-colors">
                <div className="flex justify-between items-center mb-2 gap-2">
                  <p className="text-[11px] text-muted tracking-widest uppercase font-semibold truncate" title={b.type}>{b.type}</p>
                  <span className={`text-[10px] font-bold whitespace-nowrap px-2 py-0.5 rounded-full ${b.remaining <= 0 ? "bg-red-500/10 text-red-400" :
                      b.remaining <= 3 ? "bg-amber-400/10 text-amber-400" : "bg-cyan/10 text-cyan"
                    }`}>
                    {b.remaining} left
                  </span>
                </div>
                <div className="flex items-end gap-1.5">
                  <p className="text-2xl font-bold text-foreground leading-none">{b.used_days}</p>
                  <p className="text-[11px] text-muted mb-0.5 font-semibold">/ {b.quota} used</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Admin Tabs ── */}
        {isAdmin && (
          <div className="flex items-center gap-1 bg-muted/5 border border-muted/10 p-1 rounded-xl w-fit">
            {(["pending", "all"] as AdminTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 capitalize ${adminTab === tab
                    ? "bg-surface shadow-sm text-foreground"
                    : "text-muted hover:text-foreground"
                  }`}>
                {tab === "pending" ? "Pending Requests" : "All Requests"}
              </button>
            ))}
          </div>
        )}

        {/* ── Table ── */}
        <div className="bg-surface border border-muted/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-muted/10 flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-cyan to-violet" />
            <span className="text-sm font-semibold text-foreground">
              {isAdmin
                ? adminTab === "pending" ? "Awaiting Approval" : "All Leave Requests"
                : "My Leave History"}
            </span>
            {pagination && (
              <span className="ml-auto text-[11px] text-muted">
                {pagination.totalCount} request{pagination.totalCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20 gap-3">
              <Loader2 size={20} className="text-cyan animate-spin" />
              <span className="text-sm text-muted">Loading…</span>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center gap-3 px-6 py-10 text-red-400">
              <AlertCircle size={18} /><span className="text-sm">{error}</span>
            </div>
          )}

          {!loading && !error && leaves.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted">
              <FileText size={32} strokeWidth={1.2} />
              <p className="text-sm">
                {isAdmin && adminTab === "pending"
                  ? "No pending leave requests. All caught up! ✓"
                  : "No leave requests yet."}
              </p>
              {!isAdmin && (
                <button onClick={() => setRequestModalOpen(true)}
                  className="text-cyan text-sm font-semibold hover:underline">
                  Request your first leave →
                </button>
              )}
            </div>
          )}

          {!loading && !error && leaves.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-muted/10">
                    {isAdmin && (
                      <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Employee</th>
                    )}
                    <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Dates</th>
                    <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Reason</th>
                    <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Status</th>
                    {isAdmin && (
                      <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => (
                    <LeaveRow
                      key={leave._id}
                      leave={leave}
                      isAdmin={isAdmin}
                      onApprove={() => { setActionLeave(leave); setActionType("APPROVED"); }}
                      onReject={() => { setActionLeave(leave); setActionType("REJECTED"); }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination && (
            <PaginationBar
              page={page}
              totalPages={pagination.totalPages}
              totalCount={pagination.totalCount}
              limit={LIMIT}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            />
          )}
        </div>
      </motion.div>
    </>
  );
}

export default function LeavePage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 size={28} className="text-cyan animate-spin" /></div>}>
      <LeavePageInner />
    </Suspense>
  );
}