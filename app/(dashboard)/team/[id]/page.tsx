"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft, Loader2, Calendar as CalendarIcon, FileText, CheckSquare, CheckCircle2, XCircle, Clock, DollarSign, Plus, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CalendarView from "@/components/CalendarView";
import PayrollSection from "@/src/components/employee/PayrollSection";
import Link from "next/link";
import { format } from "date-fns";

interface EmployeeDetails {
  _id: string;
  name: string;
  email: string;
  role_id: {
    title: string;
    department: string;
    level: string;
} | null;
}

function EmployeeLeavesTab({ employeeId }: { employeeId: string }) {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/leave?userId=${employeeId}&limit=50`)
      .then(res => res.json())
      .then(json => {
        if (json.success) setLeaves(json.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [employeeId]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-cyan" /></div>;

  if (leaves.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted">
      <FileText size={32} strokeWidth={1.2} />
      <p className="text-sm">No leave requests found.</p>
    </div>
  );

  return (
    <div className="bg-surface border border-muted/10 rounded-2xl overflow-hidden mt-4">
      <table className="w-full text-left border-collapse">
        <tbody>
          {leaves.map((leave) => {
            const days = Math.round((new Date(leave.end_date).getTime() - new Date(leave.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const statusColors = {
              PENDING: "bg-amber-400/10 text-amber-400 border-amber-400/20",
              APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
              REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
            };
            const StatusIcon = leave.status === "APPROVED" ? CheckCircle2 : leave.status === "REJECTED" ? XCircle : Clock;
            
            return (
              <tr key={leave._id} className="border-b border-muted/10 hover:bg-muted/5 transition-colors">
                <td className="px-5 py-4 min-w-[150px]">
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    <CalendarIcon size={13} className="text-muted shrink-0" />
                    <span>{new Date(leave.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    {leave.start_date !== leave.end_date && (
                      <><span className="text-muted">–</span><span>{new Date(leave.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 ml-[21px]">
                    <p className="text-[11px] text-muted">{days} day{days !== 1 ? "s" : ""}</p>
                    {leave.leave_type && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-muted/30" />
                        <span className="text-[10px] uppercase font-bold text-cyan">{leave.leave_type}</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 max-w-[200px]">
                  <p className="text-sm text-foreground/80 truncate" title={leave.reason}>{leave.reason}</p>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusColors[leave.status as keyof typeof statusColors]}`}>
                    <StatusIcon size={11} />
                    {leave.status}
                  </span>
                  {leave.is_loss_of_pay && (
                    <span className="ml-1.5 text-[10px] text-red-400 font-semibold">LOP</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Demerit Modal (Admin only)
// ─────────────────────────────────────────────────────────────────────────────
function AddDemeritModal({ open, onClose, employeeId, onCreated }: {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  onCreated: () => void;
}) {
  const [reason, setReason] = useState("");
  const [points, setPoints] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (open) { setReason(""); setPoints(1); setError(null); } }, [open]);
  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/blackpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: employeeId, reason, points }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message); } else { onCreated(); onClose(); }
    } catch { setError("Network error."); } finally { setLoading(false); }
  }

  const inputCls = "w-full bg-background border border-muted/10 rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-amber-400/40 transition-all";

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md bg-surface border border-muted/10 rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert size={18} className="text-amber-400" />
            <h2 className="text-lg font-bold">Add Manual Demerit</h2>
          </div>
          <p className="text-xs text-muted mb-6">Issue a manual black point for this employee.</p>
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold tracking-widest uppercase text-muted/80 block mb-1.5">Points</label>
              <input type="number" min="1" required value={points} onChange={e => setPoints(Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className="text-[11px] font-semibold tracking-widest uppercase text-muted/80 block mb-1.5">Reason</label>
              <textarea required rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Describe the reason for this demerit..." className={inputCls + " resize-none"} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted border border-muted/20 hover:bg-muted/5 transition-all">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-amber-400 text-black hover:bg-amber-300 transition-all flex justify-center items-center">
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Issue Demerit"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Employee Demerits Tab
// ─────────────────────────────────────────────────────────────────────────────
function EmployeeDemeritsTab({ employeeId, isAdmin }: { employeeId: string; isAdmin: boolean }) {
  const [points, setPoints] = useState<any[]>([]);
  const [totalUnresolved, setTotalUnresolved] = useState(0);
  const [loading, setLoading] = useState(true);
  const [demeritModalOpen, setDemeritModalOpen] = useState(false);

  const fetchDemerits = useCallback(() => {
    setLoading(true);
    fetch(`/api/blackpoints?userId=${employeeId}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) { setPoints(json.data); setTotalUnresolved(json.totalUnresolved ?? 0); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [employeeId]);

  useEffect(() => { fetchDemerits(); }, [fetchDemerits]);

  const typeColors: Record<string, string> = {
    AUTO_LATE: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    AUTO_EARLY_CHECKOUT: "bg-orange-400/10 text-orange-400 border-orange-400/20",
    MANUAL: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
            <ShieldAlert size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-muted uppercase font-bold tracking-widest">Unresolved Points</p>
            <p className="text-2xl font-black text-foreground">{totalUnresolved}</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setDemeritModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-amber-400 text-black text-xs font-bold rounded-lg hover:bg-amber-300 transition-all shadow-sm"
          >
            <Plus size={13} /> Add Demerit
          </button>
        )}
      </div>

      <AddDemeritModal
        open={demeritModalOpen}
        onClose={() => setDemeritModalOpen(false)}
        employeeId={employeeId}
        onCreated={fetchDemerits}
      />

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-cyan" /></div>
      ) : points.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted">
          <ShieldAlert size={32} strokeWidth={1.2} />
          <p className="text-sm">No demerit records found.</p>
        </div>
      ) : (
        <div className="bg-surface border border-muted/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[550px]">
              <thead>
                <tr className="border-b border-muted/10 bg-muted/5">
                  <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Date</th>
                  <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Type</th>
                  <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Points</th>
                  <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Reason</th>
                  <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Status</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p._id} className="border-b border-muted/10 hover:bg-muted/5 transition-colors">
                    <td className="px-5 py-3 text-sm font-semibold">{new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeColors[p.type] ?? "bg-muted/10 text-muted border-muted/20"}`}>{p.type.replace(/_/g, " ")}</span>
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-amber-400">{p.points}</td>
                    <td className="px-5 py-3 max-w-[220px]"><p className="text-xs text-foreground/80 line-clamp-2" title={p.reason}>{p.reason}</p></td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.is_resolved ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                        {p.is_resolved ? "Resolved" : "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function AddManualTimeModal({ open, onClose, employeeId, onCreated }: {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ date: "", check_in: "", check_out: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({ date: format(new Date(), "yyyy-MM-dd"), check_in: "", check_out: "", description: "" });
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Combine date and time
    const checkInDate = new Date(`${form.date}T${form.check_in}`);
    let checkOutDate = null;
    if (form.check_out) {
      checkOutDate = new Date(`${form.date}T${form.check_out}`);
    }

    try {
      const res = await fetch("/api/attendance/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: employeeId,
          date: form.date,
          check_in: checkInDate.toISOString(),
          check_out: checkOutDate ? checkOutDate.toISOString() : null,
          description: form.description
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message);
      } else {
        onCreated();
        onClose();
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full bg-background border border-muted/10 rounded-xl px-3.5 py-2.5 text-sm text-foreground " +
    "placeholder:text-muted/40 focus:outline-none focus:border-cyan/40 transition-all";

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 py-10 overflow-y-auto pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md bg-surface border border-muted/10 rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
          <h2 className="text-lg font-bold mb-1">Add Manual Time</h2>
          <p className="text-xs text-muted mb-6">Manually log hours for this employee.</p>
          
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold tracking-widest uppercase text-muted/80 block mb-1.5">Date</label>
              <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold tracking-widest uppercase text-muted/80 block mb-1.5">Check In</label>
                <input type="time" required value={form.check_in} onChange={e => setForm({ ...form, check_in: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-[11px] font-semibold tracking-widest uppercase text-muted/80 block mb-1.5">Check Out</label>
                <input type="time" value={form.check_out} onChange={e => setForm({ ...form, check_out: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold tracking-widest uppercase text-muted/80 block mb-1.5">Description / Reason</label>
              <textarea placeholder="e.g. Worked late on weekend project..." required rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inputCls + " resize-none"} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted border border-muted/20 hover:bg-muted/5 transition-all">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-foreground text-background hover:bg-foreground/90 transition-all flex justify-center items-center">
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Save Time"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function AttendanceLogTab({ employeeId }: { employeeId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(() => {
    fetch(`/api/attendance/log?userId=${employeeId}&limit=50`)
      .then(res => res.json())
      .then(json => {
        if (json.success) setLogs(json.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [employeeId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-cyan" /></div>;

  if (logs.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted">
      <Clock size={32} strokeWidth={1.2} />
      <p className="text-sm">No attendance records found.</p>
    </div>
  );

  return (
    <div className="bg-surface border border-muted/10 rounded-2xl overflow-hidden mt-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[650px]">
          <thead>
            <tr className="border-b border-muted/10 bg-muted/5">
              <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Date</th>
              <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Check In / Out</th>
              <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Status / Added By</th>
              <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70 max-w-[200px]">Description</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const dateStr = format(new Date(log.date), "MMM d, yyyy (EEE)");
              const inStr = log.check_in ? format(new Date(log.check_in), "HH:mm") : "--:--";
              const outStr = log.check_out ? format(new Date(log.check_out), "HH:mm") : "--:--";
              const isManual = !!log.added_by;

              return (
                <tr key={log._id} className="border-b border-muted/10 hover:bg-muted/5 transition-colors">
                  <td className="px-5 py-4 font-semibold text-sm">
                    {dateStr}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-foreground">{inStr} <span className="text-muted">–</span> {outStr}</span>
                    <p className="text-[10px] text-muted font-mono mt-0.5">
                      {log.check_in && log.check_out ? `${((new Date(log.check_out).getTime() - new Date(log.check_in).getTime()) / 3600000).toFixed(1)} hrs` : "-"}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan/10 border border-cyan/20 text-cyan">{log.status}</span>
                      {isManual && (
                        <span className="text-[10px] text-muted/80 bg-muted/10 px-1.5 py-0.5 rounded">added by Admin</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 max-w-[200px]">
                    <p className="text-xs text-foreground/80 leading-relaxed line-clamp-2" title={log.description}>{log.description || <span className="text-muted/50 italic">Standard API Check-in</span>}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Removed old salary components since PayrollSection replaces them.

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const id = params.id as string;

  const [employee, setEmployee] = useState<EmployeeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"CALENDAR" | "LOGS" | "LEAVES" | "TASKS" | "SALARY" | "DEMERITS">("CALENDAR");
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // to reload child components after manual add

  const isAdmin = (session?.user as any)?.role?.level === "ADMIN";
  const [isBlackpointEnabled, setIsBlackpointEnabled] = useState(false);

  useEffect(() => {
    // Fetch this user from the main team list to get their role info
    fetch(`/api/team`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          const found = json.data.find((u: any) => u._id === id);
          if (found) setEmployee(found);
        }
        setLoading(false);
      });

    // Fetch org-level feature flag
    fetch("/api/settings")
      .then(r => r.json())
      .then(json => {
        if (json.success) setIsBlackpointEnabled(json.data.is_blackpoint_enabled ?? false);
      })
      .catch(() => {});
  }, [id]);

  if (loading) {
    return <div className="flex h-[calc(100vh-theme(spacing.16))] items-center justify-center"><Loader2 size={28} className="text-cyan animate-spin" /></div>;
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-theme(spacing.16))] gap-4">
        <h2 className="text-xl font-bold text-muted">Employee Not Found</h2>
        <button onClick={() => router.back()} className="px-4 py-2 bg-foreground text-background text-sm font-bold rounded-xl active:scale-95 transition-all">Go Back</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[calc(100vh-theme(spacing.16))] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-6 md:px-8 border-b border-muted/10 bg-background flex flex-col gap-6">
        <button onClick={() => router.push('/team')} className="flex items-center gap-2 text-muted hover:text-cyan transition-colors w-fit text-sm font-semibold">
          <ChevronLeft size={16} /> Back to Team
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan/20 to-violet/20 border border-cyan/20 flex items-center justify-center text-xl font-black text-cyan shadow-sm">
              {employee.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">{employee.name}</h1>
              <p className="text-muted text-sm font-medium">{employee.role_id?.title || "No Role"} · {employee.role_id?.department || "No Department"}</p>
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => setManualModalOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-foreground text-background text-xs font-bold rounded-lg hover:bg-foreground/90 transition-all shadow-sm">
              <Clock size={13} /> Add Manual Time
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 mt-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("CALENDAR")}
            className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 shrink-0 ${activeTab === "CALENDAR" ? "border-cyan text-cyan" : "border-transparent text-muted hover:text-foreground"}`}
          >
            <div className="flex items-center gap-2"><CalendarIcon size={16} /> Dashboard</div>
          </button>
          <button
            onClick={() => setActiveTab("LOGS")}
            className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 shrink-0 ${activeTab === "LOGS" ? "border-cyan text-cyan" : "border-transparent text-muted hover:text-foreground"}`}
          >
            <div className="flex items-center gap-2"><Clock size={16} /> Attendance Logs</div>
          </button>
          <button
            onClick={() => setActiveTab("LEAVES")}
            className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 shrink-0 ${activeTab === "LEAVES" ? "border-cyan text-cyan" : "border-transparent text-muted hover:text-foreground"}`}
          >
            <div className="flex items-center gap-2"><FileText size={16} /> Leaves</div>
          </button>
          <button
            onClick={() => setActiveTab("TASKS")}
            className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 shrink-0 ${activeTab === "TASKS" ? "border-cyan text-cyan" : "border-transparent text-muted hover:text-foreground"}`}
          >
            <div className="flex items-center gap-2"><CheckSquare size={16} /> Tasks</div>
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab("SALARY")}
              className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 shrink-0 ${activeTab === "SALARY" ? "border-cyan text-cyan" : "border-transparent text-muted hover:text-foreground"}`}
            >
              <div className="flex items-center gap-2"><DollarSign size={16} /> Salary Packages</div>
            </button>
          )}
          {isAdmin && isBlackpointEnabled && (
            <button
              onClick={() => setActiveTab("DEMERITS")}
              className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 shrink-0 ${activeTab === "DEMERITS" ? "border-amber-400 text-amber-400" : "border-transparent text-muted hover:text-foreground"}`}
            >
              <div className="flex items-center gap-2"><ShieldAlert size={16} /> Demerits</div>
            </button>
          )}
        </div>
      </div>

      <AddManualTimeModal 
        open={manualModalOpen} 
        onClose={() => setManualModalOpen(false)} 
        employeeId={employee._id} 
        onCreated={() => setRefreshKey(k => k + 1)} 
      />

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-surface/30">
        <AnimatePresence mode="wait">
          {activeTab === "CALENDAR" && (
            <motion.div key={`cal-${refreshKey}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full">
              {/* Reuse CalendarView */}
              <CalendarView employeeId={employee._id} />
            </motion.div>
          )}

          {activeTab === "LOGS" && (
            <motion.div key={`logs-${refreshKey}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full">
              <AttendanceLogTab employeeId={employee._id} />
            </motion.div>
          )}

          {activeTab === "LEAVES" && (
            <motion.div key="leaves" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full">
              <EmployeeLeavesTab employeeId={employee._id} />
            </motion.div>
          )}

          {activeTab === "TASKS" && (
            <motion.div key="tasks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center justify-center h-48 text-muted">
              <CheckSquare size={32} className="mb-4 opacity-50" />
              <p className="text-sm font-medium">Task assignments view coming soon.</p>
            </motion.div>
          )}

          {activeTab === "SALARY" && isAdmin && (
            <motion.div key="salary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full mt-4">
              <PayrollSection userId={employee._id} isAdmin={isAdmin} />
            </motion.div>
          )}

          {activeTab === "DEMERITS" && isAdmin && isBlackpointEnabled && (
            <motion.div key="demerits" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full">
              <EmployeeDemeritsTab employeeId={employee._id} isAdmin={isAdmin} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
