"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  ShieldOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  Briefcase,
  Plus,
  Building2,
  Pencil,
  Trash2,
} from "lucide-react";
import { EditEmployeeModal, EditRoleModal, DeleteModal } from "./EditModals";
import ErrorModal from "@/components/ErrorModal";

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────
export interface Role {
  _id: string;
  title: string;
  department: string;
  level: "ADMIN" | "EMPLOYEE";
  createdAt?: string;
}

export interface TeamMember {
  _id: string;
  name: string;
  email: string;
  employee_id?: string;
  date_of_joining?: string;
  is_active: boolean;
  role_id: Role | null;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shared helpers
// ─────────────────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const LEVEL_STYLES: Record<string, string> = {
  ADMIN: "bg-violet/20 text-violet border border-violet/30",
  EMPLOYEE: "bg-cyan/10 text-cyan border border-cyan/20",
};

const AVATAR_COLORS = [
  "from-cyan/40 to-violet/40",
  "from-violet/40 to-pink-500/40",
  "from-emerald-400/30 to-cyan/40",
  "from-amber-400/30 to-orange-500/40",
  "from-rose-400/30 to-violet/40",
];

const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-off-white " +
  "placeholder:text-muted/40 focus:outline-none focus:border-cyan/40 focus:bg-white/[0.07] transition-all";

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

// ─────────────────────────────────────────────────────────────────────────────
//  Add Employee Modal
// ─────────────────────────────────────────────────────────────────────────────
function AddEmployeeModal({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (m: TeamMember) => void;
}) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role_id: "", employee_id: "", date_of_joining: "" });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setRolesLoading(true);
    fetch("/api/roles").then(r => r.json()).then(j => j.success && setRoles(j.data)).finally(() => setRolesLoading(false));
    setForm({ name: "", email: "", password: "", role_id: "", employee_id: "", date_of_joining: "" });
    setErrors({}); setApiError(null); setSuccess(false);
    setTimeout(() => firstInputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  function validate() {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = "Full name is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.password) e.password = "Password is required.";
    else if (form.password.length < 6) e.password = "At least 6 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true); setApiError(null);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password, role_id: form.role_id || null, employee_id: form.employee_id.trim(), date_of_joining: form.date_of_joining }),
      });
      const json = await res.json();
      if (!json.success) { setApiError(json.message ?? "Something went wrong."); return; }
      setSuccess(true);
      onCreated(json.data);
      setTimeout(onClose, 1200);
    } catch { setApiError("Network error — please try again."); }
    finally { setSubmitting(false); }
  }

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm(p => ({ ...p, [field]: e.target.value }));
      if (errors[field]) setErrors(p => ({ ...p, [field]: undefined }));
    };
  }

  const inputCls =
    "w-full bg-background border border-muted/10 rounded-xl px-3.5 py-2.5 text-sm text-foreground " +
    "placeholder:text-muted/40 focus:outline-none focus:border-cyan/40 focus:bg-background transition-all";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="emp-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <motion.div key="emp-modal" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 28 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md bg-surface border border-muted/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.4)] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-5 border-b border-muted/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center"><UserPlus size={13} className="text-cyan" /></div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Add Employee</h2>
                    <p className="text-[10px] text-muted">Create a new team member account</p>
                  </div>
                </div>
                <button onClick={onClose} className="text-muted hover:text-foreground w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/10 transition-all"><X size={15} /></button>
              </div>
              <AnimatePresence>
                {success && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2.5 px-6 py-3.5 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={15} /><span className="text-sm font-semibold">Employee created successfully!</span></motion.div>}
                {apiError && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2.5 px-6 py-3.5 bg-red-500/10 border-b border-red-500/20 text-red-600 dark:text-red-400"><AlertCircle size={15} /><span className="text-sm">{apiError}</span></motion.div>}
              </AnimatePresence>
              <form onSubmit={handleSubmit} noValidate>
                <div className="px-6 py-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Full Name" error={errors.name}><input ref={firstInputRef} type="text" placeholder="e.g. Alex Johnson" value={form.name} onChange={set("name")} className={inputCls} /></Field>
                    <Field label="Email Address" error={errors.email}><input type="email" placeholder="alex@company.io" value={form.email} onChange={set("email")} className={inputCls} /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Employee ID" error={errors.employee_id}><input type="text" placeholder="e.g. EMP-001" value={form.employee_id} onChange={set("employee_id")} className={inputCls} /></Field>
                    <Field label="Date of Joining" error={errors.date_of_joining}><input type="date" value={form.date_of_joining} onChange={set("date_of_joining")} className={inputCls} /></Field>
                  </div>
                  <Field label="Temporary Password" error={errors.password}>
                    <div className="relative">
                      <input type={showPw ? "text" : "password"} placeholder="Min. 6 characters" value={form.password} onChange={set("password")} className={inputCls + " pr-10"} />
                      <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors">{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                    </div>
                  </Field>
                  <Field label="Role" error={errors.role_id}>
                    {rolesLoading ? (
                      <div className="flex items-center gap-2 h-10 px-3.5 bg-background border border-muted/10 rounded-xl"><Loader2 size={13} className="text-cyan animate-spin" /><span className="text-sm text-muted">Loading roles…</span></div>
                    ) : (
                      <select value={form.role_id} onChange={set("role_id")} className={inputCls + " appearance-none cursor-pointer"}>
                        <option value="" className="bg-surface">— Select a role —</option>
                        {roles.map(r => <option key={r._id} value={r._id} className="bg-surface">{r.title} · {r.department} ({r.level})</option>)}
                      </select>
                    )}
                  </Field>
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-muted/10">
                  <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted border border-muted/20 hover:bg-muted/5 hover:text-foreground transition-all">Cancel</button>
                  <button type="submit" disabled={submitting || success} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan to-[#0099cc] shadow-[0_0_20px_rgba(0,242,254,0.2)] hover:shadow-[0_0_28px_rgba(0,242,254,0.35)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all">
                    {submitting ? <><Loader2 size={14} className="animate-spin" />Creating…</> : "Create Employee"}
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
//  Create Role Modal
// ─────────────────────────────────────────────────────────────────────────────
function CreateRoleModal({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (r: Role) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ title: "", department: "", level: "EMPLOYEE" as "ADMIN" | "EMPLOYEE" });
  const [errors, setErrors] = useState<{ title?: string; department?: string }>({});
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm({ title: "", department: "", level: "EMPLOYEE" });
    setErrors({}); setApiError(null); setSuccess(false);
    setTimeout(() => firstRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  function validate() {
    const e: typeof errors = {};
    if (!form.title.trim()) e.title = "Title is required.";
    if (!form.department.trim()) e.department = "Department is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true); setApiError(null);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title.trim(), department: form.department.trim(), level: form.level }),
      });
      const json = await res.json();
      if (!json.success) { setApiError(json.message ?? "Something went wrong."); return; }
      setSuccess(true);
      onCreated(json.data);
      setTimeout(onClose, 1200);
    } catch { setApiError("Network error — please try again."); }
    finally { setSubmitting(false); }
  }

  const inputCls =
    "w-full bg-background border border-muted/10 rounded-xl px-3.5 py-2.5 text-sm text-foreground " +
    "placeholder:text-muted/40 focus:outline-none focus:border-cyan/40 focus:bg-background transition-all";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="role-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <motion.div key="role-modal" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 28 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-sm bg-surface border border-muted/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.4)] overflow-hidden" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-muted/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-violet/10 border border-violet/20 flex items-center justify-center"><ShieldCheck size={13} className="text-violet" /></div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Create Role</h2>
                    <p className="text-[10px] text-muted">Define a new organisational role</p>
                  </div>
                </div>
                <button onClick={onClose} className="text-muted hover:text-foreground w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/10 transition-all"><X size={15} /></button>
              </div>

              {/* Banners */}
              <AnimatePresence>
                {success && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2.5 px-6 py-3.5 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={15} /><span className="text-sm font-semibold">Role created successfully!</span></motion.div>}
                {apiError && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2.5 px-6 py-3.5 bg-red-500/10 border-b border-red-500/20 text-red-600 dark:text-red-400"><AlertCircle size={15} /><span className="text-sm">{apiError}</span></motion.div>}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate>
                <div className="px-6 py-5 space-y-4">
                  <Field label="Role Title" error={errors.title}><input ref={firstRef} type="text" placeholder="e.g. Software Engineer" value={form.title} onChange={e => { setForm(p => ({ ...p, title: e.target.value })); setErrors(p => ({ ...p, title: undefined })); }} className={inputCls} /></Field>
                  <Field label="Department" error={errors.department}><input type="text" placeholder="e.g. Engineering" value={form.department} onChange={e => { setForm(p => ({ ...p, department: e.target.value })); setErrors(p => ({ ...p, department: undefined })); }} className={inputCls} /></Field>

                  {/* Level toggle */}
                  <Field label="Access Level">
                    <div className="grid grid-cols-2 gap-2">
                      {(["EMPLOYEE", "ADMIN"] as const).map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setForm(p => ({ ...p, level: lvl }))}
                          className={`py-2.5 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2
                            ${form.level === lvl
                              ? lvl === "ADMIN"
                                ? "bg-violet/15 border-violet/40 text-violet"
                                : "bg-cyan/10 border-cyan/30 text-cyan"
                              : "bg-surface border-muted/10 text-muted hover:border-muted/30 hover:text-foreground"
                            }`}
                        >
                          {lvl === "ADMIN" ? <ShieldCheck size={13} /> : <Briefcase size={13} />}
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-muted/10">
                  <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted border border-muted/20 hover:bg-muted/5 hover:text-foreground transition-all">Cancel</button>
                  <button type="submit" disabled={submitting || success} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet to-purple-600 shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:shadow-[0_0_28px_rgba(139,92,246,0.35)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all">
                    {submitting ? <><Loader2 size={14} className="animate-spin" />Creating…</> : "Create Role"}
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
//  Role Card
// ─────────────────────────────────────────────────────────────────────────────
function RoleCard({ role, index, onEdit, onDelete }: { role: Role; index: number; onEdit: () => void; onDelete: () => void }) {
  const isAdmin = role.level === "ADMIN";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: "easeOut" }}
      className="bg-surface border border-muted/10 rounded-2xl p-5 flex flex-col gap-4 hover:border-muted/30 transition-colors relative group"
    >
      {/* Icon + badge */}
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border
          ${isAdmin ? "bg-violet/10 border-violet/20" : "bg-cyan/10 border-cyan/20"}`}>
          {isAdmin ? <ShieldCheck size={18} className="text-violet" /> : <Briefcase size={18} className="text-cyan" />}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full border
            ${isAdmin ? LEVEL_STYLES.ADMIN : LEVEL_STYLES.EMPLOYEE}`}>
            {role.level}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="text-muted hover:text-cyan p-1 transition-colors"><Pencil size={14} /></button>
            <button onClick={onDelete} className="text-muted hover:text-red-500 p-1 transition-colors"><Trash2 size={14} /></button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div>
        <p className="text-sm font-bold text-foreground">{role.title}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <Building2 size={11} className="text-muted" />
          <p className="text-[11px] text-muted">{role.department}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Team Member Row
// ─────────────────────────────────────────────────────────────────────────────
function MemberRow({ member, index, onEdit, onDelete }: { member: TeamMember; index: number; onEdit: () => void; onDelete: () => void }) {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const role = member.role_id;
  return (
    <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, duration: 0.35, ease: "easeOut" }} className="group border-b border-muted/10 hover:bg-muted/5 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${color} border border-white/10 flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>{initials(member.name)}</div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-none">{member.name}</p>
            <p className="text-[11px] text-muted mt-0.5">{member.email}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        {role ? (
          <div className="flex flex-col gap-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide w-fit ${LEVEL_STYLES[role.level] ?? LEVEL_STYLES.EMPLOYEE}`}>{role.level}</span>
            <p className="text-[11px] text-muted leading-none">{role.title} · {role.department}</p>
          </div>
        ) : (
          <span className="text-[11px] text-muted/50 italic">Unassigned</span>
        )}
      </td>
      <td className="px-6 py-4">
        {member.is_active ? (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={13} /><span className="text-[12px] font-semibold">Active</span></div>
        ) : (
          <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400/70"><XCircle size={13} /><span className="text-[12px] font-semibold">Inactive</span></div>
        )}
      </td>
      <td className="px-6 py-4 text-[12px] text-muted hidden xl:table-cell">
        {new Date(member.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="text-muted hover:text-cyan p-1.5 transition-colors"><Pencil size={15} /></button>
          <button onClick={onDelete} className="text-muted hover:text-red-500 p-1.5 transition-colors"><Trash2 size={15} /></button>
        </div>
      </td>
    </motion.tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Page
// ─────────────────────────────────────────────────────────────────────────────
type Tab = "members" | "roles";

export default function TeamPage() {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<Tab>("members");

  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);

  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  const [isDeletingRole, setIsDeletingRole] = useState(false);

  const [errorInfo, setErrorInfo] = useState<{title: string; message: string} | null>(null);

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    setIsDeletingMember(true);
    try {
      const res = await fetch(`/api/team/${memberToDelete}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) { setErrorInfo({ title: "Cannot Delete Member", message: json.message }); return; }
      setMembers(p => p.filter(m => m._id !== memberToDelete));
      setMemberToDelete(null);
    } catch (e) {
      setErrorInfo({ title: "Deletion Failed", message: "Network error. Failed to delete member." });
    } finally {
      setIsDeletingMember(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    setIsDeletingRole(true);
    try {
      const res = await fetch(`/api/roles/${roleToDelete}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) { setErrorInfo({ title: "Action Blocked", message: json.message }); return; }
      setRoles(p => p.filter(r => r._id !== roleToDelete));
      setRoleToDelete(null);
    } catch (e) {
      setErrorInfo({ title: "Deletion Failed", message: "Network error. Failed to delete role." });
    } finally {
      setIsDeletingRole(false);
    }
  };

  // Members state
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [empModalOpen, setEmpModalOpen] = useState(false);

  // Roles state
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  const userRole = (session?.user as any)?.role?.level ?? null;
  const isAdmin = userRole === "ADMIN";

  // Fetch members
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/team").then(r => r.json()).then(j => {
      if (!j.success) throw new Error(j.message);
      setMembers(j.data);
    }).catch(e => setMembersError(e.message)).finally(() => setMembersLoading(false));
  }, [status]);

  // Fetch roles
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/roles").then(r => r.json()).then(j => {
      if (!j.success) throw new Error(j.message);
      setRoles(j.data);
    }).catch(e => setRolesError(e.message)).finally(() => setRolesLoading(false));
  }, [status]);

  if (status === "loading") {
    return <div className="flex h-full items-center justify-center"><Loader2 size={28} className="text-cyan animate-spin" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <ShieldOff size={36} className="text-red-400" />
        </motion.div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
          <p className="text-sm text-muted mt-1 max-w-xs">You need <span className="text-cyan font-semibold">ADMIN</span> privileges to view this page.</p>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "members" as Tab, label: "Team Members", icon: Users, count: members.length },
    { id: "roles" as Tab, label: "Roles", icon: ShieldCheck, count: roles.length },
  ];

  return (
    <>
      <AddEmployeeModal open={empModalOpen} onClose={() => setEmpModalOpen(false)} onCreated={m => setMembers(p => [m, ...p])} />
      <CreateRoleModal open={roleModalOpen} onClose={() => setRoleModalOpen(false)} onCreated={r => setRoles(p => [r, ...p])} />

      {/* Edit Modals */}
      <EditEmployeeModal
        open={!!editingMember}
        member={editingMember}
        onClose={() => setEditingMember(null)}
        onUpdated={m => setMembers(p => p.map(x => x._id === m._id ? m : x))}
      />
      <EditRoleModal
        open={!!editingRole}
        role={editingRole}
        onClose={() => setEditingRole(null)}
        onUpdated={r => setRoles(p => p.map(x => x._id === r._id ? r : x))}
      />

      {/* Delete Modals */}
      <DeleteModal
        open={!!memberToDelete}
        title="Remove Team Member?"
        description="Are you sure you want to remove this employee? This action cannot be undone."
        onClose={() => setMemberToDelete(null)}
        onConfirm={handleDeleteMember}
        isDeleting={isDeletingMember}
      />
      <DeleteModal
        open={!!roleToDelete}
        title="Delete Role?"
        description="Are you sure you want to delete this role? Any users assigned to it will retain their access until updated."
        onClose={() => setRoleToDelete(null)}
        onConfirm={handleDeleteRole}
        isDeleting={isDeletingRole}
      />
      
      <ErrorModal
        open={!!errorInfo}
        title={errorInfo?.title || ""}
        message={errorInfo?.message || ""}
        onClose={() => setErrorInfo(null)}
      />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="p-6 md:p-8 space-y-6">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users size={18} className="text-cyan" />
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-cyan/70">People & Org</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Team Management</h1>
            <p className="text-sm text-muted mt-1">Manage members and define organisational roles.</p>
          </div>

          {/* CTAs — contextual per tab */}
          {tab === "members" ? (
            <button id="add-employee-btn" onClick={() => setEmpModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan to-[#0099cc] text-[#0A0A0B] text-sm font-bold tracking-tight shadow-[0_0_24px_rgba(0,242,254,0.25)] hover:shadow-[0_0_32px_rgba(0,242,254,0.40)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
              <UserPlus size={15} strokeWidth={2.5} />Add Employee
            </button>
          ) : (
            <button id="create-role-btn" onClick={() => setRoleModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet to-purple-600 text-white text-sm font-bold tracking-tight shadow-[0_0_24px_rgba(139,92,246,0.25)] hover:shadow-[0_0_32px_rgba(139,92,246,0.40)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
              <Plus size={15} strokeWidth={2.5} />Create Role
            </button>
          )}
        </div>

        {/* ── Stats Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Members", value: members.length, color: "text-foreground" },
            { label: "Active", value: members.filter(m => m.is_active).length, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Total Roles", value: roles.length, color: "text-violet" },
            { label: "Departments", value: new Set(roles.map(r => r.department)).size, color: "text-cyan" },
          ].map(s => (
            <div key={s.label} className="bg-surface border border-muted/10 rounded-2xl px-5 py-4">
              <p className="text-[11px] text-muted tracking-widest uppercase font-semibold mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-muted/5 border border-muted/10 p-1 rounded-xl w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                ${tab === t.id ? "bg-surface shadow-sm text-foreground" : "text-muted hover:text-foreground"}`}>
              <t.icon size={14} />
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                ${tab === t.id ? "bg-muted/10 text-foreground" : "bg-muted/5 text-muted"}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Tab: Members ── */}
        <AnimatePresence mode="wait">
          {tab === "members" && (
            <motion.div key="members-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <div className="bg-surface border border-muted/10 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-muted/10 flex items-center gap-2">
                  <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-cyan to-violet" />
                  <span className="text-sm font-semibold text-foreground">All Members</span>
                  <span className="ml-auto text-[11px] text-muted">{members.length} record{members.length !== 1 ? "s" : ""}</span>
                </div>

                {membersLoading && <div className="flex items-center justify-center py-20 gap-3"><Loader2 size={20} className="text-cyan animate-spin" /><span className="text-sm text-muted">Fetching roster…</span></div>}
                {!membersLoading && membersError && <div className="flex items-center gap-3 px-6 py-10 text-red-600 dark:text-red-400"><AlertCircle size={18} /><span className="text-sm">{membersError}</span></div>}
                {!membersLoading && !membersError && members.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted">
                    <Users size={32} strokeWidth={1.2} />
                    <p className="text-sm">No team members yet.</p>
                    <button onClick={() => setEmpModalOpen(true)} className="text-cyan text-sm font-semibold hover:underline">Add the first employee →</button>
                  </div>
                )}
                {!membersLoading && !membersError && members.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-muted/10">
                          {["Member", "Role & Department", "Status", "Joined", "Actions"].map((col, i) => (
                            <th key={col} className={`px-6 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted/70 ${i === 3 ? "hidden xl:table-cell" : ""} ${i === 4 ? "text-right" : ""}`}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>{members.map((m, i) => <MemberRow key={m._id} member={m} index={i} onEdit={() => setEditingMember(m)} onDelete={() => setMemberToDelete(m._id)} />)}</tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Tab: Roles ── */}
          {tab === "roles" && (
            <motion.div key="roles-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {rolesLoading && <div className="flex items-center justify-center py-20 gap-3"><Loader2 size={20} className="text-cyan animate-spin" /><span className="text-sm text-muted">Loading roles…</span></div>}
              {!rolesLoading && rolesError && <div className="flex items-center gap-3 px-6 py-10 text-red-600 dark:text-red-400 bg-surface rounded-2xl border border-muted/10"><AlertCircle size={18} /><span className="text-sm">{rolesError}</span></div>}
              {!rolesLoading && !rolesError && roles.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted bg-surface rounded-2xl border border-muted/10">
                  <ShieldCheck size={32} strokeWidth={1.2} />
                  <p className="text-sm">No roles defined yet.</p>
                  <button onClick={() => setRoleModalOpen(true)} className="text-violet text-sm font-semibold hover:underline">Create the first role →</button>
                </div>
              )}
              {!rolesLoading && !rolesError && roles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {roles.map((r, i) => <RoleCard key={r._id} role={r} index={i} onEdit={() => setEditingRole(r)} onDelete={() => setRoleToDelete(r._id)} />)}
                  {/* Ghost "add" card */}
                  <motion.button
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: roles.length * 0.05 + 0.05 }}
                    onClick={() => setRoleModalOpen(true)}
                    className="border-2 border-dashed border-muted/20 rounded-2xl p-5 flex flex-col items-center justify-center gap-2
                               text-muted hover:border-violet/30 hover:text-violet hover:bg-violet/5 transition-all min-h-[130px]"
                  >
                    <Plus size={20} strokeWidth={1.5} />
                    <span className="text-sm font-semibold">New Role</span>
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
