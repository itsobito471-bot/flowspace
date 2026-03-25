"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Plus, X, ChevronRight, ChevronLeft, Check,
  Loader2, AlertCircle, Users, CreditCard, Shield, Zap,
  CheckCircle2, Circle, ArrowRight, Search
} from "lucide-react";
import { format } from "date-fns";

interface Org {
  _id: string; name: string; slug: string;
  status: "ACTIVE" | "SUSPENDED"; max_users: number; user_count: number;
  plan_id: { _id: string; name: string; price: number; max_users: number } | null;
  createdAt: string;
}
interface Plan { _id: string; name: string; price: number; max_users: number; features: string[]; }

const BG = "#0A0A0B", SURFACE = "#161618", SURFACE2 = "#1C1C1F";
const BORDER = "rgba(255,255,255,0.07)", CYAN = "#00F2FE", VIOLET = "#892CDC", MUTED = "#666680";

function StatusBadge({ status }: { status: "ACTIVE" | "SUSPENDED" }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={status === "ACTIVE"
        ? { background: "rgba(0,242,254,0.1)", color: CYAN, border: `1px solid rgba(0,242,254,0.2)` }
        : { background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
      {status}
    </span>
  );
}

function OnboardModal({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: (org: Org) => void;
}) {
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ org_name: "", slug: "", plan_id: "", admin_name: "", admin_email: "", admin_password: "" });

  useEffect(() => {
    if (form.org_name) setForm(f => ({ ...f, slug: f.org_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }));
  }, [form.org_name]);

  useEffect(() => {
    if (step === 1 && plans.length === 0) {
      setPlansLoading(true);
      fetch("/api/super-admin/plans").then(r => r.json()).then(j => { if (j.success) setPlans(j.data); }).finally(() => setPlansLoading(false));
    }
  }, [step, plans.length]);

  useEffect(() => {
    if (open) { setStep(0); setError(null); setDone(false); setForm({ org_name: "", slug: "", plan_id: "", admin_name: "", admin_email: "", admin_password: "" }); }
  }, [open]);

  async function handleSubmit() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/super-admin/organizations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!json.success) { setError(json.message); return; }
      setDone(true);
      setTimeout(() => { onSuccess(json.data.organization); onClose(); }, 1500);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  const steps = ["Organization", "Plan", "Admin"];
  const canNext = [form.org_name.trim() && form.slug.trim(), true, form.admin_name.trim() && form.admin_email.trim() && form.admin_password.length >= 6];
  const inputCls = "w-full text-sm rounded-xl px-4 py-2.5 focus:outline-none transition-all";
  const iStyle = { background: BG, border: `1px solid ${BORDER}`, color: "#E8E8F0" };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
        <motion.div
          initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="pointer-events-auto w-full sm:max-w-lg flex flex-col"
          style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: "20px 20px 0 0", boxShadow: "0 -20px 80px rgba(0,0,0,0.6)" }}
        >
          {/* Drag handle on mobile */}
          <div className="flex justify-center pt-3 pb-0 sm:hidden">
            <div className="w-10 h-1 rounded-full" style={{ background: BORDER }} />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-0">
            <div>
              <h2 className="text-base font-black">Onboard New Tenant</h2>
              <p className="text-xs mt-0.5" style={{ color: MUTED }}>Set up a new organization</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5" style={{ color: MUTED }}><X size={16} /></button>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-1 px-5 py-4">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                    style={i < step ? { background: CYAN, color: "#000" } : i === step ? { background: "rgba(0,242,254,0.15)", border: `1.5px solid ${CYAN}`, color: CYAN } : { background: SURFACE2, border: `1.5px solid ${BORDER}`, color: MUTED }}>
                    {i < step ? <Check size={10} /> : i + 1}
                  </div>
                  <span className="text-xs font-semibold hidden xs:block" style={{ color: i === step ? "#E8E8F0" : MUTED }}>{s}</span>
                </div>
                {i < steps.length - 1 && <div className="flex-1 h-px mx-1" style={{ background: i < step ? CYAN : BORDER }} />}
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="px-5 pb-1 min-h-[200px] max-h-[50vh] overflow-y-auto">
            <AnimatePresence mode="wait">
              {done ? (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(0,242,254,0.15)", border: `2px solid ${CYAN}` }}>
                    <CheckCircle2 size={28} style={{ color: CYAN }} />
                  </div>
                  <p className="font-bold">Tenant Onboarded!</p>
                </motion.div>
              ) : (
                <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.15 }} className="space-y-3">
                  {step === 0 && (<>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: MUTED }}>Organization Name</label>
                      <input className={inputCls} style={iStyle} placeholder="Acme Corp" value={form.org_name} onChange={e => setForm(f => ({ ...f, org_name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: MUTED }}>Slug</label>
                      <div className="flex items-center rounded-xl overflow-hidden" style={{ background: BG, border: `1px solid ${BORDER}` }}>
                        <span className="px-3 py-2.5 text-xs font-mono shrink-0 border-r select-none" style={{ color: MUTED, borderColor: BORDER }}>flowspace.io/</span>
                        <input className="flex-1 bg-transparent text-sm px-3 py-2.5 focus:outline-none font-mono" style={{ color: "#E8E8F0" }} placeholder="acme-corp"
                          value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} />
                      </div>
                    </div>
                  </>)}
                  {step === 1 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Select Plan</p>
                      {plansLoading ? <div className="flex justify-center py-6"><Loader2 className="animate-spin" size={22} style={{ color: CYAN }} /></div>
                        : <div className="space-y-2">
                          <button onClick={() => setForm(f => ({ ...f, plan_id: "" }))} className="w-full text-left rounded-xl px-4 py-2.5 transition-all"
                            style={{ background: !form.plan_id ? "rgba(0,242,254,0.08)" : SURFACE2, border: `1px solid ${!form.plan_id ? CYAN : BORDER}` }}>
                            <div className="flex items-center justify-between">
                              <div><p className="text-sm font-bold">No Plan</p><p className="text-xs" style={{ color: MUTED }}>Assign later</p></div>
                              {!form.plan_id ? <CheckCircle2 size={15} style={{ color: CYAN }} /> : <Circle size={15} style={{ color: MUTED }} />}
                            </div>
                          </button>
                          {plans.map(plan => (
                            <button key={plan._id} onClick={() => setForm(f => ({ ...f, plan_id: plan._id }))} className="w-full text-left rounded-xl px-4 py-2.5 transition-all"
                              style={{ background: form.plan_id === plan._id ? "rgba(137,44,220,0.1)" : SURFACE2, border: `1px solid ${form.plan_id === plan._id ? VIOLET : BORDER}` }}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2"><p className="text-sm font-bold">{plan.name}</p>
                                    <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(137,44,220,0.15)", color: VIOLET }}>${plan.price}/mo</span>
                                  </div>
                                  <p className="text-xs mt-0.5" style={{ color: MUTED }}>{plan.max_users} users max</p>
                                </div>
                                {form.plan_id === plan._id ? <CheckCircle2 size={15} style={{ color: VIOLET }} /> : <Circle size={15} style={{ color: MUTED }} />}
                              </div>
                            </button>
                          ))}
                          {plans.length === 0 && <p className="text-xs text-center py-4" style={{ color: MUTED }}>No plans yet — create some in the Plans section</p>}
                        </div>}
                    </div>
                  )}
                  {step === 2 && (<>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: MUTED }}>Admin Name</label>
                      <input className={inputCls} style={iStyle} placeholder="Jane Smith" value={form.admin_name} onChange={e => setForm(f => ({ ...f, admin_name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: MUTED }}>Admin Email</label>
                      <input className={inputCls} style={iStyle} type="email" placeholder="jane@acme.com" value={form.admin_email} onChange={e => setForm(f => ({ ...f, admin_email: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: MUTED }}>Password <span style={{ fontWeight: 400, textTransform: "none" }}>(min. 6 chars)</span></label>
                      <input className={inputCls} style={iStyle} type="password" placeholder="••••••••" value={form.admin_password} onChange={e => setForm(f => ({ ...f, admin_password: e.target.value }))} />
                    </div>
                  </>)}
                </motion.div>
              )}
            </AnimatePresence>
            {error && <div className="mt-3 flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}><AlertCircle size={14} className="shrink-0" />{error}</div>}
          </div>

          {/* Footer */}
          {!done && (
            <div className="p-5 pt-3 flex items-center justify-between gap-3">
              <button onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ border: `1px solid ${BORDER}`, color: MUTED }}>
                <ChevronLeft size={14} />{step === 0 ? "Cancel" : "Back"}
              </button>
              {step < steps.length - 1 ? (
                <button onClick={() => setStep(s => s + 1)} disabled={!canNext[step]}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: canNext[step] ? `linear-gradient(135deg, ${CYAN}, ${VIOLET})` : SURFACE2, color: canNext[step] ? "#000" : MUTED, cursor: canNext[step] ? "pointer" : "not-allowed" }}>
                  Next <ChevronRight size={14} />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={!canNext[step] || loading}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: canNext[step] && !loading ? `linear-gradient(135deg, ${CYAN}, ${VIOLET})` : SURFACE2, color: canNext[step] && !loading ? "#000" : MUTED, cursor: canNext[step] && !loading ? "pointer" : "not-allowed" }}>
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <><ArrowRight size={14} /> Launch</>}
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}

// ─── Org Card (mobile) ────────────────────────────────────────────────────────
function OrgCard({ org }: { org: Org }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-sm">{org.name}</p>
          <p className="text-[11px] font-mono mt-0.5" style={{ color: MUTED }}>{org.slug}</p>
        </div>
        <StatusBadge status={org.status} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg px-3 py-2" style={{ background: SURFACE2 }}>
          <p style={{ color: MUTED }}>Plan</p>
          <p className="font-bold mt-0.5">{org.plan_id?.name || "—"}</p>
        </div>
        <div className="rounded-lg px-3 py-2" style={{ background: SURFACE2 }}>
          <p style={{ color: MUTED }}>Users</p>
          <p className="font-bold mt-0.5">{org.user_count} / {org.max_users}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/organizations");
      const json = await res.json();
      if (json.success) setOrgs(json.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const filtered = orgs.filter(o => o.name.toLowerCase().includes(search.toLowerCase()) || o.slug.toLowerCase().includes(search.toLowerCase()));
  const totalActive = orgs.filter(o => o.status === "ACTIVE").length;
  const totalUsers = orgs.reduce((s, o) => s + o.user_count, 0);

  return (
    <div className="min-h-full" style={{ background: BG, color: "#E8E8F0" }}>
      <AnimatePresence>{modalOpen && <OnboardModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={org => { setOrgs(prev => [{ ...org, user_count: 0 } as Org, ...prev]); setModalOpen(false); }} />}</AnimatePresence>

      {/* Top bar */}
      <div className="sticky top-0 z-10 px-4 sm:px-8 py-4 sm:py-5 border-b flex items-center justify-between gap-3" style={{ background: BG, borderColor: BORDER }}>
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight">Organizations</h1>
          <p className="text-xs sm:text-sm mt-0.5 hidden sm:block" style={{ color: MUTED }}>Manage all FlowSpace tenants</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all"
          style={{ background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})`, color: "#000" }}>
          <Plus size={14} strokeWidth={2.5} />
          <span className="hidden xs:block">Onboard</span>
          <span className="hidden sm:block"> Tenant</span>
        </button>
      </div>

      <div className="px-4 sm:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { label: "Total Orgs", value: orgs.length, icon: Building2, color: CYAN },
            { label: "Active", value: totalActive, icon: Shield, color: "#4ade80" },
            { label: "Users", value: totalUsers, icon: Users, color: VIOLET },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl sm:rounded-2xl p-3 sm:p-5" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-1 sm:mb-2" style={{ color: MUTED }}>{label}</p>
                  <p className="text-2xl sm:text-3xl font-black">{loading ? "—" : value}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
                  <Icon size={15} style={{ color }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
          <input className="w-full sm:max-w-sm text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none"
            style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "#E8E8F0" }}
            placeholder="Search organizations..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Mobile: card list */}
        <div className="block md:hidden space-y-3">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={26} style={{ color: CYAN }} /></div>
            : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3">
                <Building2 size={32} style={{ color: MUTED }} />
                <p className="text-sm font-semibold">{search ? "No matches" : "No organizations yet"}</p>
                {!search && <button onClick={() => setModalOpen(true)} className="text-sm font-bold flex items-center gap-1.5" style={{ color: CYAN }}><Zap size={12} /> Onboard first tenant</button>}
              </div>
            ) : filtered.map((org, i) => (
              <motion.div key={org._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <OrgCard org={org} />
              </motion.div>
            ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block rounded-2xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-[11px] uppercase tracking-widest" style={{ borderColor: BORDER, color: MUTED }}>
                <th className="px-6 py-4 font-semibold">Organization</th>
                <th className="px-6 py-4 font-semibold">Plan</th>
                <th className="px-6 py-4 font-semibold">Users</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="animate-spin mx-auto" size={26} style={{ color: CYAN }} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Building2 size={24} style={{ color: MUTED }} />
                    <p className="text-sm font-semibold">{search ? "No matching organizations" : "No organizations yet"}</p>
                    {!search && <button onClick={() => setModalOpen(true)} className="text-sm font-bold flex items-center gap-1.5" style={{ color: CYAN }}><Zap size={12} /> Onboard your first tenant</button>}
                  </div>
                </td></tr>
              ) : filtered.map((org, i) => (
                <motion.tr key={org._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="border-b transition-colors" style={{ borderColor: BORDER }}
                  onMouseEnter={e => (e.currentTarget.style.background = SURFACE2)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td className="px-6 py-4"><p className="font-bold text-sm">{org.name}</p><p className="text-[11px] font-mono mt-0.5" style={{ color: MUTED }}>{org.slug}</p></td>
                  <td className="px-6 py-4">
                    {org.plan_id ? <div><p className="text-sm font-semibold">{org.plan_id.name}</p><p className="text-[11px] mt-0.5" style={{ color: MUTED }}>${org.plan_id.price}/mo</p></div>
                      : <span className="text-sm" style={{ color: MUTED }}>No plan</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2"><span className="text-sm font-bold">{org.user_count}</span><span className="text-xs" style={{ color: MUTED }}>/ {org.max_users}</span></div>
                    <div className="h-1 rounded-full mt-1.5 w-20" style={{ background: BORDER }}>
                      <div className="h-1 rounded-full" style={{ width: `${Math.min(100, (org.user_count / org.max_users) * 100)}%`, background: `linear-gradient(90deg, ${CYAN}, ${VIOLET})` }} />
                    </div>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={org.status} /></td>
                  <td className="px-6 py-4 text-sm" style={{ color: MUTED }}>{format(new Date(org.createdAt), "MMM d, yyyy")}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
