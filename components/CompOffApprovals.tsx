"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, CheckCircle2, XCircle, Loader2, Clock, CalendarDays, User as UserIcon } from "lucide-react";

interface PendingRecord {
  _id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  comp_off_status: string;
  user_id: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    employee_id?: string;
  };
}

function calcHours(check_in: string | null, check_out: string | null): string {
  if (!check_in || !check_out) return "—";
  const diff = (new Date(check_out).getTime() - new Date(check_in).getTime()) / 3600000;
  return `${diff.toFixed(1)}h`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "from-cyan/40 to-violet/40",
  "from-violet/40 to-pink-500/40",
  "from-emerald-400/30 to-cyan/40",
  "from-amber-400/30 to-orange-500/40",
  "from-rose-400/30 to-violet/40",
];

export default function CompOffApprovals() {
  const [records, setRecords] = useState<PendingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<Record<string, boolean>>({});

  const fetchQueue = useCallback(() => {
    setLoading(true);
    fetch("/api/comp-off/approve")
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) throw new Error(json.message);
        setRecords(json.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleAction = async (attendanceId: string, status: "APPROVED" | "REJECTED") => {
    setActioning((prev) => ({ ...prev, [attendanceId]: true }));
    try {
      const res = await fetch("/api/comp-off/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceId, status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      // Remove the row on success
      setRecords((prev) => prev.filter((r) => r._id !== attendanceId));
    } catch (err: any) {
      setError(err.message ?? "Failed to process action.");
    } finally {
      setActioning((prev) => ({ ...prev, [attendanceId]: false }));
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Gift size={18} className="text-emerald-400" />
        <h2 className="text-lg font-bold tracking-tight">Comp Off Approvals</h2>
        {!loading && (
          <span className="ml-auto px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            {records.length} Pending
          </span>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-10">
          <Loader2 className="animate-spin text-cyan" size={24} />
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted bg-surface border border-muted/10 rounded-2xl">
          <Gift size={32} strokeWidth={1.2} className="text-emerald-400/50" />
          <p className="text-sm">No pending comp off requests — all caught up!</p>
        </div>
      ) : (
        <div className="bg-surface border border-muted/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-muted/10 bg-muted/5">
                  <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">
                    Employee
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">
                    Date Worked
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">
                    Hours Logged
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {records.map((rec, index) => {
                    const employee = rec.user_id;
                    const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
                    const isActioning = actioning[rec._id];

                    return (
                      <motion.tr
                        key={rec._id}
                        initial={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                        transition={{ duration: 0.3 }}
                        className="border-b border-muted/10 hover:bg-muted/5 transition-colors"
                      >
                        {/* Employee */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full bg-gradient-to-br ${color} border border-white/10 flex items-center justify-center text-[10px] font-bold text-white shrink-0 overflow-hidden`}
                            >
                              {employee?.avatar ? (
                                <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
                              ) : (
                                employee?.name ? initials(employee.name) : <UserIcon size={12} />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground leading-none">
                                {employee?.name ?? "Unknown"}
                              </p>
                              <p className="text-[11px] text-muted mt-0.5">{employee?.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays size={12} className="text-muted/60" />
                            <span className="text-sm font-semibold text-foreground">
                              {new Date(rec.date).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </td>

                        {/* Hours */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-muted/60" />
                            <span className="text-sm font-bold text-emerald-400">
                              {calcHours(rec.check_in, rec.check_out)}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => handleAction(rec._id, "APPROVED")}
                              disabled={isActioning}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isActioning ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={12} />
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(rec._id, "REJECTED")}
                              disabled={isActioning}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isActioning ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <XCircle size={12} />
                              )}
                              Reject
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
