"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Loader2, AlertCircle, CreditCard, Check, Trash2, Zap, Users, CheckCircle2 } from "lucide-react";

interface Plan { _id: string; name: string; price: number; max_users: number; features: string[]; createdAt: string; }

const BG = "var(--background)", SURFACE = "var(--surface)", SURFACE2 = "color-mix(in srgb, var(--background) 95%, var(--foreground))";
const BORDER = "var(--border-subtle, color-mix(in srgb, var(--foreground) 10%, transparent))", CYAN = "#00F2FE", VIOLET = "#892CDC", MUTED = "var(--muted)";
const FOREGROUND = "var(--foreground)";
const inputCls = "w-full text-sm rounded-xl px-4 py-2.5 focus:outline-none transition-all";
const iStyle = { background: BG, border: `1px solid ${BORDER}`, color: FOREGROUND };

function CreatePlanModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (p: Plan) => void; }) {
  const [form, setForm] = useState({ name: "", price: "", max_users: "", features: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => { if (open) { setForm({ name: "", price: "", max_users: "", features: "" }); setError(null); setDone(false); } }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const features = form.features.split(",").map(s => s.trim()).filter(Boolean);
      const res = await fetch("/api/super-admin/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, price: Number(form.price), max_users: Number(form.max_users), features }) });
      const json = await res.json();
      if (!json.success) { setError(json.message); return; }
      setDone(true);
      setTimeout(() => { onCreated(json.data); onClose(); }, 1000);
    } catch { setError("Network error."); } finally { setLoading(false); }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
        <motion.div
          initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="pointer-events-auto w-full sm:max-w-md"
          style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: "20px 20px 0 0", boxShadow: "0 -20px 60px rgba(0,0,0,0.5)" }}>
          <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full" style={{ background: BORDER }} /></div>
          <div className="flex items-center justify-between p-5 pb-3">
            <div><h2 className="text-base font-black">New Subscription Plan</h2><p className="text-xs mt-0.5" style={{ color: MUTED }}>Define a pricing tier</p></div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5" style={{ color: MUTED }}><X size={16} /></button>
          </div>
          {done ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(137,44,220,0.15)", border: `2px solid ${VIOLET}` }}><CheckCircle2 size={24} style={{ color: VIOLET }} /></div>
              <p className="font-bold text-sm">Plan Created!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: MUTED }}>Plan Name</label>
                <input className={inputCls} style={iStyle} placeholder="Starter, Pro, Enterprise" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: MUTED }}>Price ($/mo)</label>
                  <input className={inputCls} style={iStyle} type="number" min="0" placeholder="29" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: MUTED }}>Max Users</label>
                  <input className={inputCls} style={iStyle} type="number" min="1" placeholder="50" value={form.max_users} onChange={e => setForm(f => ({ ...f, max_users: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: MUTED }}>Features <span style={{ fontWeight: 400, textTransform: "none" }}>(comma separated)</span></label>
                <input className={inputCls} style={iStyle} placeholder="Attendance, Payroll, Leave" value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))} />
              </div>
              {error && <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}><AlertCircle size={13} className="shrink-0" />{error}</div>}
              <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})`, color: "#000" }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <><Check size={13} /> Create Plan</>}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </>
  );
}

const tierColor = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("enterprise")) return VIOLET;
  if (n.includes("pro")) return CYAN;
  return "#4ade80";
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch("/api/super-admin/plans"); const json = await res.json(); if (json.success) setPlans(json.data); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  async function handleDelete(planId: string) {
    setDeleting(planId);
    try { await fetch(`/api/super-admin/plans?planId=${planId}`, { method: "DELETE" }); setPlans(prev => prev.filter(p => p._id !== planId)); }
    finally { setDeleting(null); }
  }

  return (
    <div className="min-h-full" style={{ background: BG, color: FOREGROUND }}>
      <AnimatePresence>{modalOpen && <CreatePlanModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={plan => { setPlans(prev => [plan, ...prev]); setModalOpen(false); }} />}</AnimatePresence>

      {/* Top bar */}
      <div className="sticky top-0 z-10 px-4 sm:px-8 py-4 sm:py-5 border-b flex items-center justify-between" style={{ background: BG, borderColor: BORDER }}>
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight">Subscription Plans</h1>
          <p className="text-xs sm:text-sm mt-0.5 hidden sm:block" style={{ color: MUTED }}>Create and manage pricing tiers</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold"
          style={{ background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})`, color: "#000" }}>
          <Plus size={14} strokeWidth={2.5} /> <span>New Plan</span>
        </button>
      </div>

      <div className="px-4 sm:px-8 py-4 sm:py-6">
        {loading ? <div className="flex justify-center py-24"><Loader2 className="animate-spin" size={30} style={{ color: CYAN }} /></div>
          : plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: SURFACE }}><CreditCard size={24} style={{ color: MUTED }} /></div>
              <p className="text-sm font-semibold">No plans yet</p>
              <p className="text-xs text-center px-6" style={{ color: MUTED }}>Create your first plan to get started</p>
              <button onClick={() => setModalOpen(true)} className="text-sm font-bold flex items-center gap-1.5 mt-1" style={{ color: CYAN }}><Zap size={12} /> Create a plan</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {plans.map((plan, i) => {
                const color = tierColor(plan.name);
                return (
                  <motion.div key={plan._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}><CreditCard size={14} style={{ color }} /></div>
                          <h3 className="text-base font-black">{plan.name}</h3>
                        </div>
                        <div className="flex items-baseline gap-1"><span className="text-2xl sm:text-3xl font-black" style={{ color }}>${plan.price}</span><span className="text-xs" style={{ color: MUTED }}>/mo</span></div>
                      </div>
                      <button onClick={() => handleDelete(plan._id)} disabled={deleting === plan._id} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-all" style={{ color: MUTED }}>
                        {deleting === plan._id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl" style={{ background: SURFACE2 }}>
                      <Users size={12} style={{ color: MUTED }} />
                      <span className="text-xs font-semibold" style={{ color: MUTED }}>Up to</span>
                      <span className="text-sm font-black">{plan.max_users}</span>
                      <span className="text-xs" style={{ color: MUTED }}>users</span>
                    </div>
                    {plan.features.length > 0 && (
                      <ul className="space-y-1.5">
                        {plan.features.map((f, fi) => (
                          <li key={fi} className="flex items-center gap-2 text-xs">
                            <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}15` }}><Check size={8} style={{ color }} /></div>
                            <span style={{ color: MUTED }}>{f}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}
