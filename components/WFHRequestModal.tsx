"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, AlertCircle, CheckCircle2, Loader2, FileText } from "lucide-react";

interface WFHRequestModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (request: any) => void;
}

export default function WFHRequestModal({ open, onClose, onCreated }: WFHRequestModalProps) {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{ date?: string; reason?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Set today's date as default
    const today = new Date().toISOString().split("T")[0];
    setDate(today);
    setReason("");
    setErrors({});
    setApiError(null);
    setSuccess(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  function validate() {
    const e: typeof errors = {};
    if (!date) e.date = "Date is required.";
    if (!reason.trim()) e.reason = "Reason is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError(null);

    try {
      const res = await fetch("/api/wfh-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, reason: reason.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        setApiError(json.message ?? "Something went wrong.");
        return;
      }
      setSuccess(true);
      onCreated(json.data);
      setTimeout(onClose, 1200);
    } catch {
      setApiError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full bg-background border border-muted/10 rounded-xl px-3.5 py-2.5 text-sm text-foreground " +
    "placeholder:text-muted/40 focus:outline-none focus:border-cyan/40 transition-all";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-sm bg-surface border border-muted/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.4)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-muted/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center">
                    <Calendar size={13} className="text-cyan" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Request WFH</h2>
                    <p className="text-[10px] text-muted">Submit a work from home request</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-muted hover:text-foreground w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/10 transition-all"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Banners */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="flex items-center gap-2.5 px-6 py-3.5 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400"
                  >
                    <CheckCircle2 size={15} />
                    <span className="text-sm font-semibold">Request submitted successfully!</span>
                  </motion.div>
                )}
                {apiError && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="flex items-center gap-2.5 px-6 py-3.5 bg-red-500/10 border-b border-red-500/20 text-red-400"
                  >
                    <AlertCircle size={15} />
                    <span className="text-sm">{apiError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} noValidate>
                <div className="px-6 py-5 space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold tracking-widest uppercase text-muted/80">
                      Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setErrors((p) => ({ ...p, date: undefined }));
                      }}
                      className={inputCls}
                    />
                    {errors.date && <p className="text-[11px] text-red-400">{errors.date}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold tracking-widest uppercase text-muted/80">
                      Reason
                    </label>
                    <textarea
                      value={reason}
                      rows={3}
                      onChange={(e) => {
                        setReason(e.target.value);
                        setErrors((p) => ({ ...p, reason: undefined }));
                      }}
                      placeholder="e.g. WiFi issue at office / Personal commitment"
                      className={inputCls + " resize-none"}
                    />
                    {errors.reason && <p className="text-[11px] text-red-400">{errors.reason}</p>}
                  </div>
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-muted/10 bg-muted/5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted border border-muted/20 bg-background hover:bg-muted/5 hover:text-foreground transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || success}
                    className="btn-brand flex-1 py-2.5 rounded-xl text-sm font-bold disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Submitting…
                      </>
                    ) : (
                      "Submit Request"
                    )}
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
