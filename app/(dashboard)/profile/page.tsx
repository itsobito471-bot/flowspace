"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Camera, Loader2, Save, User as UserIcon, FileText, ShieldAlert, Gift, Clock, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import ErrorModal from "@/components/ErrorModal";
import PayrollSection from "@/src/components/employee/PayrollSection";

export default function ProfilePage() {
  const { data: session, update, status } = useSession();
  
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{title: string; message: string} | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session?.user) {
      if (!name) setName(session.user.name || "");
      if (!avatarPreview && session.user.image) setAvatarPreview(session.user.image);
    }
  }, [session, name, avatarPreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
      setSuccessMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorInfo({ title: "Validation Error", message: "Display name cannot be empty." });
      return;
    }

    setSaving(true);
    setSuccessMsg(null);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      if (avatar) {
        formData.append("avatar", avatar);
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        body: formData,
      });

      const json = await res.json();
      if (!json.success) {
        setErrorInfo({ title: "Update Failed", message: json.message });
        return;
      }

      // Update the NextAuth session so all TopBars / Sidebars instantly reflect changes natively
      await update({
        name: json.data.name,
        image: json.data.avatar || session?.user?.image,
      });
      
      setSuccessMsg("Profile successfully updated!");
      setAvatar(null); // Reset pending avatar
    } catch (err: any) {
      setErrorInfo({ title: "Network Error", message: "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading") {
    return <div className="p-8 flex justify-center h-full items-center"><Loader2 className="animate-spin text-cyan" /></div>;
  }

  return (
    <>
      <ErrorModal
        open={!!errorInfo}
        title={errorInfo?.title || ""}
        message={errorInfo?.message || ""}
        onClose={() => setErrorInfo(null)}
      />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto p-6 md:p-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Personal Profile</h1>
          <p className="text-muted text-sm mt-1">Manage your public display presence and identity.</p>
        </div>

        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-sm font-semibold flex items-center gap-2">
            <Save size={16} /> {successMsg}
          </motion.div>
        )}

        <div className="bg-surface border border-muted/10 rounded-3xl overflow-hidden shadow-2xl relative">
          {/* Cover Header */}
          <div className="h-40 bg-gradient-to-tr from-cyan/20 via-background to-violet/20 border-b border-muted/10" />

          <form onSubmit={handleSubmit} className="p-6 md:p-10 pt-0 relative">
            
            {/* Avatar Section */}
            <div className="flex flex-col md:flex-row gap-8 items-start relative -mt-16 mb-10">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative group cursor-pointer"
              >
                <div className="w-32 h-32 rounded-3xl overflow-hidden bg-background border-4 border-surface shadow-2xl flex items-center justify-center relative">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={56} className="text-muted/50" />
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <Camera className="text-white" size={32} />
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </div>

              <div className="pt-20 hidden md:block">
                <h3 className="text-base font-bold text-foreground hover:text-cyan transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>Update Profile Picture</h3>
                <p className="text-sm text-muted max-w-sm mt-1">Recommended image resolution is 256x256px.</p>
              </div>
            </div>

            {/* General Info */}
            <div className="space-y-6">
              <div className="flex flex-col gap-1.5 max-w-md">
                <label className="text-[11px] font-semibold tracking-widest uppercase text-muted/80">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-muted/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-cyan/40 transition-all placeholder:text-muted/40 shadow-inner"
                  placeholder="Your Name"
                />
              </div>

              <div className="flex flex-col gap-1.5 max-w-md">
                <label className="text-[11px] font-semibold tracking-widest uppercase text-muted/80">Email Address (Read-only)</label>
                <input
                  type="email"
                  value={session?.user?.email || ""}
                  disabled
                  className="w-full bg-background border border-muted/10 rounded-xl px-4 py-3 text-sm text-muted opacity-60 cursor-not-allowed shadow-inner"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-10 pt-8 border-t border-muted/10 flex gap-4 w-full md:w-auto md:justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn-brand w-full md:w-auto px-8 py-3 rounded-xl text-sm font-bold disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Save Identity</>}
              </button>
            </div>
          </form>
        </div>

        {/* Comp Off Balance Card */}
        {(session?.user as any)?.id && (
          <CompOffBalanceCard userId={(session?.user as any)?.id} />
        )}

        {/* My Attendance History with Comp Off Claim */}
        {(session?.user as any)?.id && (
          <MyAttendanceHistorySection userId={(session?.user as any)?.id} />
        )}

        {/* My Payslips Section */}
        {(session?.user as any)?.id && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FileText size={18} className="text-muted" />
              <h2 className="text-lg font-bold tracking-tight">My Payslips</h2>
            </div>
            <PayrollSection userId={(session?.user as any)?.id} isAdmin={false} />
          </div>
        )}

        {/* My Demerits Section */}
        {(session?.user as any)?.id && (
          <MyDemeritsSection userId={(session?.user as any)?.id} />
        )}
      </motion.div>
    </>
  );
}

// ── Comp Off Balance Card ───────────────────────────────────────────────────────
function CompOffBalanceCard({ userId }: { userId: string }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setBalance(json.data?.earned_comp_offs ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading || balance === null) return null;

  return (
    <div className="bg-surface border border-muted/10 rounded-2xl p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
        <Gift size={22} className="text-emerald-400" />
      </div>
      <div>
        <p className="text-[10px] font-bold tracking-widest uppercase text-muted/80">Comp Off Balance</p>
        <p className="text-2xl font-black text-emerald-400 leading-tight">
          {balance} <span className="text-sm font-semibold text-muted">day{balance !== 1 ? "s" : ""} available</span>
        </p>
        <p className="text-[11px] text-muted mt-0.5">
          Earned from working on weekends &amp; public holidays.
        </p>
      </div>
    </div>
  );
}

// ── My Attendance History w/ Comp Off Claim ──────────────────────────────────
function MyAttendanceHistorySection({ userId }: { userId: string }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;

  const fetchHistory = (p: number) => {
    setLoading(true);
    fetch(`/api/attendance/log?userId=${userId}&page=${p}&limit=${LIMIT}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) throw new Error(json.message ?? "Failed to load");
        setRecords(json.data);
        setTotalPages(json.pagination.totalPages ?? 1);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchHistory(1); }, [userId]);

  const handleClaim = async (attendanceId: string) => {
    setClaiming((prev) => ({ ...prev, [attendanceId]: true }));
    try {
      const res = await fetch("/api/comp-off/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      // Optimistically update the record status in state
      setRecords((prev) =>
        prev.map((r) =>
          r._id === attendanceId ? { ...r, comp_off_status: "PENDING_APPROVAL" } : r
        )
      );
    } catch (err: any) {
      setError(err.message ?? "Claim failed.");
    } finally {
      setClaiming((prev) => ({ ...prev, [attendanceId]: false }));
    }
  };

  const compOffStatusBadge = (status: string) => {
    switch (status) {
      case "ELIGIBLE":
        return null; // handled as button
      case "PENDING_APPROVAL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">
            <Clock size={9} /> Pending
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Gift size={9} /> Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays size={18} className="text-muted" />
        <h2 className="text-lg font-bold tracking-tight">Attendance History</h2>
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
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted bg-surface border border-muted/10 rounded-2xl">
          <CalendarDays size={28} strokeWidth={1.2} />
          <p className="text-sm">No attendance records found.</p>
        </div>
      ) : (
        <div className="bg-surface border border-muted/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-muted/10 bg-muted/5">
                  <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Date</th>
                  <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Check In</th>
                  <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Check Out</th>
                  <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Status</th>
                  <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Comp Off</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec._id} className="border-b border-muted/10 hover:bg-muted/5 transition-colors">
                    <td className="px-5 py-3 text-sm font-semibold">
                      {new Date(rec.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-cyan/80">
                      {rec.check_in ? new Date(rec.check_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : "—"}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-rose-400/80">
                      {rec.check_out ? new Date(rec.check_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        rec.status === "PRESENT"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : rec.status === "HALF_DAY"
                          ? "bg-amber-400/10 text-amber-400 border-amber-400/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}>{rec.status}</span>
                    </td>
                    <td className="px-5 py-3">
                      {rec.comp_off_status === "ELIGIBLE" ? (
                        <button
                          onClick={() => handleClaim(rec._id)}
                          disabled={claiming[rec._id]}
                          className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold
                            bg-emerald-500/10 text-emerald-400 border border-emerald-500/30
                            hover:bg-emerald-500/20 hover:border-emerald-500/50
                            shadow-[0_0_12px_rgba(52,211,153,0.2)] hover:shadow-[0_0_20px_rgba(52,211,153,0.35)]
                            transition-all disabled:opacity-60 disabled:cursor-not-allowed
                            animate-pulse-slow"
                        >
                          {claiming[rec._id] ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <Gift size={10} />
                          )}
                          Claim Comp Off
                        </button>
                      ) : (
                        compOffStatusBadge(rec.comp_off_status)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-muted/10">
              <span className="text-[11px] text-muted">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => { const p = page - 1; setPage(p); fetchHistory(p); }}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-muted border border-muted/15 hover:border-cyan/30 hover:text-cyan disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={12} /> Prev
                </button>
                <button
                  onClick={() => { const p = page + 1; setPage(p); fetchHistory(p); }}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-muted border border-muted/15 hover:border-cyan/30 hover:text-cyan disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── My Demerits (Employee view) ──────────────────────────────────────────────────
function MyDemeritsSection({ userId }: { userId: string }) {
  const [points, setPoints] = useState<any[]>([]);
  const [totalUnresolved, setTotalUnresolved] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDemerits = useCallback(() => {
    setLoading(true);
    fetch("/api/blackpoints")
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setPoints(json.data);
          setTotalUnresolved(json.totalUnresolved ?? 0);
        } else {
          // Module not enabled or no access — silently hide the section
          setError(json.message);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  useEffect(() => { fetchDemerits(); }, [fetchDemerits]);

  // If module is disabled for this org, don't render the section at all
  if (!loading && error) return null;

  const typeLabels: Record<string, string> = {
    AUTO_LATE: "Late Arrival",
    AUTO_EARLY_CHECKOUT: "Early Checkout",
    MANUAL: "Manual",
  };

  const typeColors: Record<string, string> = {
    AUTO_LATE: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    AUTO_EARLY_CHECKOUT: "bg-orange-400/10 text-orange-400 border-orange-400/20",
    MANUAL: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert size={18} className="text-amber-400" />
        <h2 className="text-lg font-bold tracking-tight">My Demerit History</h2>
        {!loading && (
          <span className="ml-auto px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400">
            {totalUnresolved} Active
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-cyan" /></div>
      ) : points.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted bg-surface border border-muted/10 rounded-2xl">
          <ShieldAlert size={28} strokeWidth={1.2} />
          <p className="text-sm">No demerit records — keep up the great work!</p>
        </div>
      ) : (
        <div className="bg-surface border border-muted/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-muted/10 bg-muted/5">
                  <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Date</th>
                  <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Type</th>
                  <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Pts</th>
                  <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Reason</th>
                  <th className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70">Status</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p._id} className="border-b border-muted/10 hover:bg-muted/5 transition-colors">
                    <td className="px-5 py-3 text-sm font-semibold">{new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeColors[p.type] ?? "bg-muted/10 text-muted border-muted/20"}`}>
                        {typeLabels[p.type] ?? p.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-amber-400">{p.points}</td>
                    <td className="px-5 py-3 max-w-[220px]"><p className="text-xs text-foreground/80 line-clamp-2" title={p.reason}>{p.reason}</p></td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ p.is_resolved ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
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
