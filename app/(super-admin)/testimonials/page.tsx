"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquareQuote, Search, Check, X, Trash2, Loader2, User,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";

interface Testimonial {
  _id: string;
  name: string;
  role: string;
  quote: string;
  avatar: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

const BG = "var(--background)", SURFACE = "var(--surface)", SURFACE2 = "color-mix(in srgb, var(--background) 95%, var(--foreground))";
const BORDER = "var(--border-subtle, color-mix(in srgb, var(--foreground) 10%, transparent))", CYAN = "#00F2FE", ORANGE = "#F5A623", RED = "#ef4444", MUTED = "var(--muted)", GREEN = "#10B981";
const FOREGROUND = "var(--foreground)";

function StatusBadge({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" }) {
  let bg, color, border;
  if (status === "APPROVED") {
    bg = "rgba(16, 185, 129, 0.1)"; color = GREEN; border = `1px solid rgba(16, 185, 129, 0.2)`;
  } else if (status === "REJECTED") {
    bg = "rgba(239, 68, 68, 0.1)"; color = RED; border = `1px solid rgba(239, 68, 68, 0.2)`;
  } else {
    bg = "rgba(245, 166, 35, 0.1)"; color = ORANGE; border = `1px solid rgba(245, 166, 35, 0.2)`;
  }

  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: bg, color, border }}>
      {status}
    </span>
  );
}

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null); // target ID

  const fetchTestimonials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/testimonials");
      const json = await res.json();
      if (json.success) setTestimonials(json.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTestimonials(); }, [fetchTestimonials]);

  const updateStatus = async (id: string, newStatus: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/super-admin/testimonials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const json = await res.json();
      if (json.success) {
        setTestimonials(prev => prev.map(t => t._id === id ? { ...t, status: json.data.status } : t));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const deleteTestimonial = async (id: string) => {
    if (!confirm("Are you sure you want to delete this testimonial permanently?")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/super-admin/testimonials/${id}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (json.success) {
        setTestimonials(prev => prev.filter(t => t._id !== id));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = testimonials.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.quote.toLowerCase().includes(search.toLowerCase()) ||
    t.role.toLowerCase().includes(search.toLowerCase())
  );
  
  const totalApproved = testimonials.filter(t => t.status === "APPROVED").length;
  const totalPending = testimonials.filter(t => t.status === "PENDING").length;

  return (
    <div className="min-h-full" style={{ background: BG, color: FOREGROUND }}>
      <div className="sticky top-0 z-10 px-4 sm:px-8 py-4 sm:py-5 border-b flex items-center justify-between gap-3" style={{ background: BG, borderColor: BORDER }}>
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight">Testimonials</h1>
          <p className="text-xs sm:text-sm mt-0.5 hidden sm:block" style={{ color: MUTED }}>Manage featured customer reviews</p>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { label: "Total Reviews", value: testimonials.length, icon: MessageSquareQuote, color: CYAN },
            { label: "Pending", value: totalPending, icon: AlertCircle, color: ORANGE },
            { label: "Approved", value: totalApproved, icon: Check, color: GREEN },
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

        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
          <input className="w-full sm:max-w-sm text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none" style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: FOREGROUND }} placeholder="Search quotes, names..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Desktop & Mobile Combined Card Layout since testimonials have long quotes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
             <div className="col-span-full flex justify-center py-12"><Loader2 className="animate-spin" size={26} style={{ color: CYAN }} /></div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full flex flex-col items-center py-16 gap-3">
              <MessageSquareQuote size={32} style={{ color: MUTED }} />
              <p className="text-sm font-semibold">{search ? "No matches found" : "No testimonials yet"}</p>
            </div>
          ) : filtered.map((test, i) => (
            <motion.div key={test._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-2xl p-5 flex flex-col" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  {test.avatar ? (
                    <img src={test.avatar} alt={test.name} className="w-10 h-10 rounded-full object-cover border border-muted/20" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 border border-muted/20 text-muted/80">
                      <User size={16} />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-sm">{test.name}</h3>
                    <p className="text-[11px] font-mono mt-0.5" style={{ color: MUTED }}>{test.role}</p>
                  </div>
                </div>
                <StatusBadge status={test.status} />
              </div>
              
              <div className="flex-1 mb-6">
                <p className="text-sm italic text-foreground/80 leading-relaxed">&quot;{test.quote}&quot;</p>
              </div>

              <div className="pt-4 border-t flex items-center justify-between" style={{ borderColor: BORDER }}>
                <p className="text-[10px]" style={{ color: MUTED }}>{format(new Date(test.createdAt), "MMM d, yyyy")}</p>
                <div className="flex items-center gap-2">
                  {test.status !== "APPROVED" && (
                    <button onClick={() => updateStatus(test._id, "APPROVED")} disabled={actionLoading === test._id} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-black/5 dark:bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 text-muted/80 disabled:opacity-50">
                      {actionLoading === test._id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </button>
                  )}
                  {test.status !== "REJECTED" && (
                    <button onClick={() => updateStatus(test._id, "REJECTED")} disabled={actionLoading === test._id} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-black/5 dark:bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-muted/80 disabled:opacity-50">
                      {actionLoading === test._id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                    </button>
                  )}
                  <button onClick={() => deleteTestimonial(test._id)} disabled={actionLoading === test._id} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-black/5 dark:bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-muted/80 disabled:opacity-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
