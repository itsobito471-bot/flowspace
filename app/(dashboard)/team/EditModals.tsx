"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertCircle, X, Pencil, Trash2 } from "lucide-react";
import { Role, TeamMember } from "./page";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold tracking-widest uppercase text-muted/80">{label}</label>
      {children}
      {error && (
        <p className="text-[11px] text-red-400 flex items-center gap-1">
          <AlertCircle size={10} />{error}
        </p>
      )}
    </div>
  );
}

const inputCls =
  "w-full bg-background border border-muted/10 rounded-xl px-3.5 py-2.5 text-sm text-foreground " +
  "placeholder:text-muted/40 focus:outline-none focus:border-cyan/40 focus:bg-background transition-all";

export function EditEmployeeModal({ member, open, onClose, onUpdated }: { member: TeamMember | null; open: boolean; onClose: () => void; onUpdated: (m: TeamMember) => void; }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const [form, setForm] = useState({ name: "", email: "", role_id: "", is_active: true, employee_id: "", date_of_joining: "" });
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  useEffect(() => {
    if (!open || !member) return;
    setRolesLoading(true);
    fetch("/api/roles").then(r => r.json()).then(j => j.success && setRoles(j.data)).finally(() => setRolesLoading(false));
    
    const formattedDate = member.date_of_joining ? new Date(member.date_of_joining).toISOString().split('T')[0] : "";
    setForm({ name: member.name, email: member.email, role_id: member.role_id?._id || "", is_active: member.is_active, employee_id: member.employee_id || "", date_of_joining: formattedDate });
    setErrors({}); setApiError(null);
  }, [open, member]);

  if (!member) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: any = {};
    if (!form.name.trim()) errs.name = "Required";
    if (!form.email.trim()) errs.email = "Required";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true); setApiError(null);
    try {
      const res = await fetch(`/api/team/${member!._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim().toLowerCase(), role_id: form.role_id || null, is_active: form.is_active, employee_id: form.employee_id.trim(), date_of_joining: form.date_of_joining }),
      });
      const json = await res.json();
      if (!json.success) { setApiError(json.message ?? "Failed to update."); return; }
      onUpdated(json.data);
      onClose();
    } catch { setApiError("Network error."); }
    finally { setSubmitting(false); }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md bg-surface border border-muted/10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-muted/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center"><Pencil size={13} className="text-cyan" /></div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Edit Employee</h2>
                  </div>
                </div>
                <button type="button" onClick={onClose} className="text-muted hover:text-foreground w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/10"><X size={15} /></button>
              </div>
              {apiError && <div className="px-6 py-3.5 bg-red-500/10 border-b border-red-500/20 text-red-500 text-sm flex gap-2"><AlertCircle size={15}/>{apiError}</div>}
              <form onSubmit={handleSubmit}>
                <div className="px-6 py-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Full Name" error={errors.name}><input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} /></Field>
                    <Field label="Email Address" error={errors.email}><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputCls} /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Employee ID" error={errors.employee_id}><input type="text" value={form.employee_id} onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))} className={inputCls} /></Field>
                    <Field label="Date of Joining" error={errors.date_of_joining}><input type="date" value={form.date_of_joining} onChange={e => setForm(p => ({ ...p, date_of_joining: e.target.value }))} className={inputCls} /></Field>
                  </div>
                  <Field label="Role">
                    <select value={form.role_id} onChange={e => setForm(p => ({ ...p, role_id: e.target.value }))} className={inputCls + " appearance-none"}>
                      <option value="" className="bg-surface">— No role —</option>
                      {roles.map(r => <option key={r._id} value={r._id} className="bg-surface">{r.title}</option>)}
                    </select>
                  </Field>
                  <Field label="Status">
                     <select value={form.is_active ? "true" : "false"} onChange={e => setForm(p => ({...p, is_active: e.target.value === "true"}))} className={inputCls}>
                       <option value="true" className="bg-surface">Active</option>
                       <option value="false" className="bg-surface">Inactive</option>
                     </select>
                  </Field>
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-muted/10">
                  <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted border border-muted/20 hover:bg-muted/5">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-cyan hover:bg-cyan/90 disabled:opacity-50 flex justify-center gap-2">
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : "Save Changes"}
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

export function EditRoleModal({ role, open, onClose, onUpdated }: { role: Role | null; open: boolean; onClose: () => void; onUpdated: (r: Role) => void; }) {
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", department: "", level: "EMPLOYEE" as "ADMIN" | "EMPLOYEE" });
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  useEffect(() => {
    if (!open || !role) return;
    setForm({ title: role.title, department: role.department, level: role.level });
    setErrors({}); setApiError(null);
  }, [open, role]);

  if (!role) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: any = {};
    if (!form.title.trim()) errs.title = "Required";
    if (!form.department.trim()) errs.department = "Required";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true); setApiError(null);
    try {
      const res = await fetch(`/api/roles/${role!._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title.trim(), department: form.department.trim(), level: form.level }),
      });
      const json = await res.json();
      if (!json.success) { setApiError(json.message ?? "Failed to update."); return; }
      onUpdated(json.data);
      onClose();
    } catch { setApiError("Network error."); }
    finally { setSubmitting(false); }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-sm bg-surface border border-muted/10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-muted/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-violet/10 border border-violet/20 flex items-center justify-center"><Pencil size={13} className="text-violet" /></div>
                  <div><h2 className="text-sm font-bold text-foreground">Edit Role</h2></div>
                </div>
                <button type="button" onClick={onClose} className="text-muted hover:text-foreground w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/10"><X size={15} /></button>
              </div>
              {apiError && <div className="px-6 py-3.5 bg-red-500/10 border-b border-red-500/20 text-red-500 text-sm flex gap-2"><AlertCircle size={15}/>{apiError}</div>}
              <form onSubmit={handleSubmit}>
                <div className="px-6 py-5 space-y-4">
                  <Field label="Role Title" error={errors.title}><input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} /></Field>
                  <Field label="Department" error={errors.department}><input type="text" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} className={inputCls} /></Field>
                  <Field label="Access Level">
                    <div className="grid grid-cols-2 gap-2">
                      {(["EMPLOYEE", "ADMIN"] as const).map(lvl => (
                        <button type="button" key={lvl} onClick={() => setForm(p => ({...p, level: lvl}))} className={`py-2 rounded-xl border text-sm font-semibold ${form.level === lvl ? (lvl === "ADMIN" ? "bg-violet/15 border-violet/40 text-violet" : "bg-cyan/10 border-cyan/30 text-cyan") : "bg-surface border-muted/10 text-muted"}`}>{lvl}</button>
                      ))}
                    </div>
                  </Field>
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-muted/10">
                  <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted border border-muted/20 hover:bg-muted/5">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-violet hover:bg-violet/90 disabled:opacity-50 flex justify-center gap-2">
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : "Save Changes"}
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

export function DeleteModal({
  open,
  title,
  description,
  onClose,
  onConfirm,
  isDeleting
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-sm bg-surface border border-muted/10 rounded-2xl shadow-2xl overflow-hidden p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-2">{title}</h2>
              <p className="text-sm text-muted mb-8 px-4">{description}</p>
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted border border-muted/20 hover:bg-muted/5 hover:text-foreground transition-all">Cancel</button>
                <button type="button" onClick={onConfirm} disabled={isDeleting} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_28px_rgba(239,68,68,0.35)] disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : "Delete"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
