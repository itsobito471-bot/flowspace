"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FileText, Plus, X, Loader2, CheckCircle2, Circle, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface PayrollSectionProps {
  userId: string;
  isAdmin: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────
interface ToastMsg { id: number; message: string; type: "success" | "error" }

function Toast({ toasts, dismiss }: { toasts: ToastMsg[]; dismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold backdrop-blur-sm transition-all
            ${t.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-400"
              : "bg-red-950/90 border-red-500/30 text-red-400"}`}
        >
          {t.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {t.message}
          <button onClick={() => dismiss(t.id)} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Confirmation Dialog
// ─────────────────────────────────────────────────────────────────────────────
function DeleteConfirmDialog({ open, onCancel, onConfirm, loading }: {
  open: boolean; onCancel: () => void; onConfirm: () => void; loading: boolean;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-sm bg-surface border border-muted/10 rounded-2xl shadow-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
              <Trash2 size={16} className="text-red-400" />
            </div>
            <h3 className="text-base font-bold">Delete Salary Entry</h3>
          </div>
          <p className="text-sm text-muted mb-6 leading-relaxed">
            This will permanently remove this salary entry from the history. <span className="text-foreground font-semibold">This action cannot be undone.</span>
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted border border-muted/20 hover:bg-muted/5 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <><Trash2 size={14} /> Delete</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function PayrollSection({ userId, isAdmin }: PayrollSectionProps) {
  const [activeTab, setActiveTab] = useState<"SALARY" | "PAYSLIPS">(isAdmin ? "SALARY" : "PAYSLIPS");

  const [salaryLogs, setSalaryLogs] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [updateSalaryModal, setUpdateSalaryModal] = useState(false);
  const [editingLog, setEditingLog] = useState<any | null>(null); // non-null = editing an existing log
  const [generatePayslipModal, setGeneratePayslipModal] = useState(false);

  // Delete confirmation
  const [deletingLog, setDeletingLog] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const toastCounter = useRef(0);

  function showToast(message: string, type: "success" | "error") {
    const id = Date.now() + (toastCounter.current++);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => dismissToast(id), 4000);
  }

  function dismissToast(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  const fetchSalary = useCallback(async () => {
    try {
      const res = await fetch(`/api/team/${userId}/salary`);
      const json = await res.json();
      if (json.success) setSalaryLogs(json.data);
    } catch (e) {
      console.error(e);
    }
  }, [userId]);

  const fetchPayslips = useCallback(async () => {
    try {
      const res = await fetch(`/api/team/${userId}/payslip`);
      const json = await res.json();
      if (json.success) setPayslips(json.data);
    } catch (e) {
      console.error(e);
    }
  }, [userId]);

  useEffect(() => {
    Promise.all([fetchSalary(), fetchPayslips()]).then(() => setLoading(false));
  }, [fetchSalary, fetchPayslips]);

  const togglePublish = async (payslipId: string) => {
    try {
      const res = await fetch(`/api/team/${userId}/payslip/${payslipId}/publish`, { method: "PATCH" });
      const json = await res.json();
      if (json.success) fetchPayslips();
    } catch (e) {
      console.error("Publish error", e);
    }
  };

  async function handleDeleteConfirm() {
    if (!deletingLog) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/team/${userId}/salary?logId=${deletingLog._id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        showToast("Salary entry deleted successfully.", "success");
        fetchSalary();
      } else {
        showToast(json.message || "Failed to delete. Please try again.", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setDeleteLoading(false);
      setDeletingLog(null);
    }
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-cyan" size={32} /></div>;

  const now = new Date();
  let currentBase = 0;
  for (const s of salaryLogs) {
    if (new Date(s.effective_date) <= now) {
      currentBase = s.amount;
      break;
    }
  }

  return (
    <>
      <Toast toasts={toasts} dismiss={dismissToast} />

      <div className="bg-surface rounded-2xl overflow-hidden border border-muted/10 text-foreground">
        {/* Header Tabs */}
        <div className="flex px-4 items-center gap-2 border-b border-muted/10 bg-muted/5">
          {isAdmin && (
            <button
              onClick={() => setActiveTab("SALARY")}
              className={`py-4 px-2 text-sm font-semibold transition-all border-b-2 ${activeTab === "SALARY" ? "border-cyan text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
            >
              Salary Config
            </button>
          )}
          <button
            onClick={() => setActiveTab("PAYSLIPS")}
            className={`py-4 px-2 text-sm font-semibold transition-all border-b-2 ${activeTab === "PAYSLIPS" ? "border-cyan text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
          >
            {isAdmin ? "Payslips List" : "My Payslips"}
          </button>
        </div>

        {/* Main Content Areas */}
        <div className="p-6">
          {activeTab === "SALARY" && isAdmin && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 p-6 rounded-2xl bg-background border border-muted/10">
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Current Base Salary</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">
                      ${currentBase.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </span>
                    <span className="text-muted text-sm font-medium">/ year</span>
                  </div>
                </div>

                <button
                  onClick={() => { setEditingLog(null); setUpdateSalaryModal(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan text-background font-bold text-sm rounded-xl hover:bg-cyan/90 transition-all"
                >
                  <Plus size={16} strokeWidth={2.5} /> Update Salary Configuration
                </button>
              </div>

              {/* History Table */}
              {salaryLogs.length > 0 && (
                <div className="border border-muted/10 rounded-2xl overflow-hidden bg-background">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-muted/5 border-b border-muted/10 text-xs text-muted uppercase tracking-wider">
                        <th className="px-5 py-3 font-semibold">Package Details</th>
                        <th className="px-5 py-3 font-semibold">Effective Date</th>
                        <th className="px-5 py-3 font-semibold">Status</th>
                        <th className="px-5 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salaryLogs.map((log) => {
                        const isCurrent = log.amount === currentBase && new Date(log.effective_date) <= now;
                        const isArchived = new Date(log.effective_date) <= now && log.amount !== currentBase;

                        return (
                          <tr key={log._id} className="border-b border-muted/10 last:border-0 hover:bg-muted/5">
                            <td className="px-5 py-4">
                              <p className="font-bold text-base mb-1">${log.amount.toLocaleString()}</p>
                              {log.breakdown && log.breakdown.length > 0 && (
                                <div className="space-y-1 mt-2">
                                  {log.breakdown.map((b: any, i: number) => (
                                    <div key={i} className="flex justify-between text-xs text-muted max-w-[200px]">
                                      <span>{b.title}</span>
                                      <span className="font-medium">${b.amount.toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-4 align-top">
                              {format(new Date(log.effective_date), "MMM d, yyyy")}
                            </td>
                            <td className="px-5 py-4 align-top">
                              {isCurrent ? (
                                <span className="px-2 py-1 bg-cyan/10 text-cyan rounded text-xs font-bold uppercase">Current</span>
                              ) : isArchived ? (
                                <span className="px-2 py-1 bg-muted/10 text-muted rounded text-xs font-bold uppercase">Archived</span>
                              ) : (
                                <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded text-xs font-bold uppercase">Upcoming</span>
                              )}
                            </td>
                            <td className="px-5 py-4 align-top">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => { setEditingLog(log); setUpdateSalaryModal(true); }}
                                  title="Edit"
                                  className="p-1.5 text-muted hover:text-cyan hover:bg-cyan/10 rounded-lg transition-all"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => setDeletingLog(log)}
                                  title="Delete"
                                  className="p-1.5 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "PAYSLIPS" && (
            <div>
              {isAdmin && (
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setGeneratePayslipModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background font-bold text-sm rounded-xl hover:bg-gray-200 transition-all"
                  >
                    <FileText size={16} /> Generate Payslip
                  </button>
                </div>
              )}

              {payslips.length === 0 ? (
                <div className="p-12 rounded-2xl bg-background border border-muted/10 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/10 text-muted flex items-center justify-center mb-3">
                    <FileText size={20} />
                  </div>
                  <h4 className="text-base font-semibold">No payslips available</h4>
                  <p className="text-muted text-sm mt-1">There are no payslip records to display here.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {payslips.map(p => {
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const isPublished = p.status === "PUBLISHED";
                    return (
                      <div
                        key={p._id}
                        className="flex justify-between items-center p-4 rounded-xl bg-background border border-muted/10 hover:border-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-muted/5 border border-muted/10 flex flex-col items-center justify-center">
                            <span className="text-[10px] font-bold uppercase text-muted">{monthNames[p.month - 1]}</span>
                            <span className="text-sm font-bold">{p.year}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold">Payslip #{p._id.slice(-6).toUpperCase()}</h4>
                              {!isAdmin && isPublished && (
                                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[10px] font-bold uppercase tracking-wider">Issued</span>
                              )}
                            </div>
                            <p className="text-xs text-muted mt-0.5">Base Snapshot: ${p.base_salary.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-[10px] font-semibold text-muted uppercase">Net Pay</p>
                            <p className="text-base font-bold text-foreground">${p.net_pay.toLocaleString()}</p>
                          </div>
                          {isAdmin && (
                            <div className="flex flex-col items-end border-l border-muted/10 pl-5">
                              <button
                                onClick={() => togglePublish(p._id)}
                                className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${isPublished ? "text-emerald-500 hover:text-emerald-400" : "text-muted hover:text-foreground"}`}
                              >
                                {isPublished ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                {isPublished ? "PUBLISHED" : "PUBLISH TO USER"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        <UpdateSalaryModal
          open={updateSalaryModal}
          onClose={() => { setUpdateSalaryModal(false); setEditingLog(null); }}
          userId={userId}
          editingLog={editingLog}
          onSuccess={(msg) => {
            showToast(msg, "success");
            fetchSalary();
            setUpdateSalaryModal(false);
            setEditingLog(null);
          }}
          onError={(msg) => showToast(msg, "error")}
        />
        <GeneratePayslipModal
          open={generatePayslipModal}
          onClose={() => setGeneratePayslipModal(false)}
          userId={userId}
          currentBase={currentBase}
          onSuccess={() => {
            fetchPayslips();
            setGeneratePayslipModal(false);
          }}
        />
      </div>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deletingLog}
        onCancel={() => setDeletingLog(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Update / Edit Salary Modal
// ─────────────────────────────────────────────────────────────────────────────
function UpdateSalaryModal({ open, onClose, userId, editingLog, onSuccess, onError }: {
  open: boolean;
  onClose: () => void;
  userId: string;
  editingLog: any | null;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const isEditing = !!editingLog;

  const [effectiveDate, setEffectiveDate] = useState("");
  const [breakdown, setBreakdown] = useState<{ title: string, amount: number }[]>([{ title: "Basic", amount: 0 }]);
  const [loading, setLoading] = useState(false);

  // Pre-fill when editing
  useEffect(() => {
    if (open) {
      if (editingLog) {
        setEffectiveDate(format(new Date(editingLog.effective_date), "yyyy-MM-dd"));
        setBreakdown(editingLog.breakdown?.length > 0 ? editingLog.breakdown : [{ title: "Basic", amount: editingLog.amount }]);
      } else {
        setEffectiveDate("");
        setBreakdown([{ title: "Basic", amount: 0 }]);
      }
    }
  }, [open, editingLog]);

  const totalAmount = breakdown.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isEditing
        ? `/api/team/${userId}/salary?logId=${editingLog._id}`
        : `/api/team/${userId}/salary`;
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: totalAmount, effective_date: effectiveDate, breakdown })
      });
      const json = await res.json();
      if (json.success) {
        onSuccess(isEditing ? "Salary entry updated successfully." : "Salary configuration saved.");
      } else {
        onError(json.message || "Something went wrong. Please try again.");
      }
    } catch {
      onError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function addRow() { setBreakdown(prev => [...prev, { title: "", amount: 0 }]); }

  function updateRow(index: number, field: string, value: any) {
    setBreakdown(prev => {
      const nw = [...prev];
      nw[index] = { ...nw[index], [field]: value };
      return nw;
    });
  }

  function removeRow(index: number) {
    setBreakdown(prev => prev.filter((_, i) => i !== index));
  }

  const inputBase = "bg-background border border-muted/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan/40 transition-all text-foreground";
  const inputCls = `w-full ${inputBase}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface rounded-2xl p-6 border border-muted/10 shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-lg font-bold">{isEditing ? "Edit Salary Entry" : "Configure Salary Package"}</h2>
            {isEditing && <p className="text-xs text-muted mt-0.5">Modifying entry from {format(new Date(editingLog.effective_date), "MMM d, yyyy")}</p>}
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="mb-6 p-4 bg-muted/5 rounded-xl border border-muted/10 flex justify-between items-center">
          <span className="text-xs font-bold tracking-widest uppercase text-muted">Total Package Pay</span>
          <span className="text-2xl font-black text-cyan">${totalAmount.toLocaleString()}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-muted block mb-1.5">Salary Breakdown Components</label>
              <button type="button" onClick={addRow} className="text-cyan text-xs font-bold hover:underline">+ Add Row</button>
            </div>
            <div className="space-y-2">
              {breakdown.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input type="text" placeholder="Component Name" required value={item.title} onChange={e => updateRow(i, 'title', e.target.value)} className={`${inputBase} flex-1 min-w-0`} />
                  <input type="number" placeholder="0" required value={item.amount || ''} onChange={e => updateRow(i, 'amount', Number(e.target.value))} className={`${inputBase} w-28 shrink-0`} />
                  <button type="button" onClick={() => removeRow(i)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg shrink-0"><X size={16} /></button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted block mb-1.5">Effective Date</label>
            <input type="date" required value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} className={inputCls} />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-cyan text-background font-bold text-sm rounded-xl hover:bg-cyan/90 transition-all flex justify-center mt-2">
            {loading ? <Loader2 className="animate-spin" size={18} /> : isEditing ? "Save Changes" : "Save Salary Configuration"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate Payslip Modal (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function GeneratePayslipModal({ open, onClose, userId, currentBase, onSuccess }: { open: boolean, onClose: () => void, userId: string, currentBase: number, onSuccess: () => void }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [additions, setAdditions] = useState<{ title: string, amount: number }[]>([]);
  const [deductions, setDeductions] = useState<{ title: string, amount: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const totalAdd = additions.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalDed = deductions.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const netPay = currentBase + totalAdd - totalDed;

  if (!open) return null;

  async function handleSubmit() {
    setLoading(true);
    await fetch(`/api/team/${userId}/payslip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, year, additions, deductions })
    });
    setLoading(false);
    onSuccess();
  }

  function addRow(setter: any) { setter((prev: any) => [...prev, { title: "", amount: 0 }]); }

  function updateRow(setter: any, index: number, field: string, value: any) {
    setter((prev: any) => {
      const nw = [...prev];
      nw[index] = { ...nw[index], [field]: value };
      return nw;
    });
  }

  function removeRow(setter: any, index: number) {
    setter((prev: any) => prev.filter((_: any, i: number) => i !== index));
  }

  const inputCls = "bg-background border border-muted/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan/40 transition-all text-foreground";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-surface rounded-2xl border border-muted/10 shadow-xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="p-5 border-b border-muted/10 flex justify-between items-center bg-muted/5 rounded-t-2xl">
          <h2 className="text-base font-bold">Generate Payslip</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X size={18} /></button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted mb-1 block">Month</label>
              <select value={month} onChange={e => setMonth(Number(e.target.value))} className={`${inputCls} w-full`}>
                {Array.from({ length: 12 }).map((_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted mb-1 block">Year</label>
              <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className={`${inputCls} w-full`} />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-background border border-muted/10 flex justify-between items-center">
            <span className="text-xs font-semibold text-muted uppercase">Base Snapshot</span>
            <span className="text-base font-bold">${currentBase.toLocaleString()}</span>
          </div>

          {/* Additions */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-semibold text-foreground">Earn/Additions</h3>
              <button onClick={() => addRow(setAdditions)} className="text-cyan text-xs font-bold hover:underline">+ Add Row</button>
            </div>
            <div className="space-y-2">
              {additions.map((add, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" placeholder="Desc" value={add.title} onChange={e => updateRow(setAdditions, i, 'title', e.target.value)} className={`${inputCls} flex-1`} />
                  <input type="number" placeholder="0" value={add.amount || ''} onChange={e => updateRow(setAdditions, i, 'amount', Number(e.target.value))} className={`${inputCls} w-24`} />
                  <button onClick={() => removeRow(setAdditions, i)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><X size={16} /></button>
                </div>
              ))}
              {additions.length === 0 && <p className="text-xs text-muted">No additions</p>}
            </div>
          </div>

          {/* Deductions */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-semibold text-foreground">Deductions</h3>
              <button onClick={() => addRow(setDeductions)} className="text-red-400 text-xs font-bold hover:underline">+ Add Row</button>
            </div>
            <div className="space-y-2">
              {deductions.map((ded, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" placeholder="Desc" value={ded.title} onChange={e => updateRow(setDeductions, i, 'title', e.target.value)} className={`${inputCls} flex-1 border-red-500/20 focus:border-red-500`} />
                  <input type="number" placeholder="0" value={ded.amount || ''} onChange={e => updateRow(setDeductions, i, 'amount', Number(e.target.value))} className={`${inputCls} w-24 border-red-500/20 focus:border-red-500`} />
                  <button onClick={() => removeRow(setDeductions, i)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><X size={16} /></button>
                </div>
              ))}
              {deductions.length === 0 && <p className="text-xs text-muted">No deductions</p>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-muted/10 bg-muted/5 rounded-b-2xl">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-semibold text-muted">Est. Net Pay</span>
            <span className="text-2xl font-bold">${netPay.toLocaleString()}</span>
          </div>
          <button onClick={handleSubmit} disabled={loading} className="w-full py-2.5 bg-foreground text-background font-bold text-sm rounded-xl hover:opacity-90 transition-all flex justify-center items-center">
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Save Payslip (Draft)"}
          </button>
        </div>
      </div>
    </div>
  );
}