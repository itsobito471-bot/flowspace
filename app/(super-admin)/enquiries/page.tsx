"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle, Search, Mail, Building, Users, Clock, CheckCircle, Reply, Trash2, Loader2
} from "lucide-react";
import { format } from "date-fns";

interface Enquiry {
  _id: string;
  full_name: string;
  company: string;
  team_size: string;
  message?: string;
  status: "NEW" | "CONTACTED" | "RESOLVED";
  createdAt: string;
}

const BG = "#0A0A0B", SURFACE = "#161618", SURFACE2 = "#1C1C1F";
const BORDER = "rgba(255,255,255,0.07)", CYAN = "#00F2FE", BLUE = "#3B82F6", GREEN = "#10B981", MUTED = "#666680", RED = "#EF4444";

function StatusBadge({ status }: { status: "NEW" | "CONTACTED" | "RESOLVED" }) {
  let bg, color, border;
  if (status === "RESOLVED") {
    bg = "rgba(16, 185, 129, 0.1)"; color = GREEN; border = `1px solid rgba(16, 185, 129, 0.2)`;
  } else if (status === "CONTACTED") {
    bg = "rgba(59, 130, 246, 0.1)"; color = BLUE; border = `1px solid rgba(59, 130, 246, 0.2)`;
  } else {
    bg = "rgba(0, 242, 254, 0.1)"; color = CYAN; border = `1px solid rgba(0, 242, 254, 0.2)`;
  }

  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: bg, color, border }}>
      {status}
    </span>
  );
}

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/enquiries");
      const json = await res.json();
      if (json.success) setEnquiries(json.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEnquiries(); }, [fetchEnquiries]);

  const updateStatus = async (id: string, newStatus: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/super-admin/enquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const json = await res.json();
      if (json.success) {
        setEnquiries(prev => prev.map(e => e._id === id ? { ...e, status: json.data.status } : e));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const deleteEnquiry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this enquiry permanently?")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/super-admin/enquiries/${id}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (json.success) {
        setEnquiries(prev => prev.filter(e => e._id !== id));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = enquiries.filter(e => 
    e.company.toLowerCase().includes(search.toLowerCase()) || 
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (e.message && e.message.toLowerCase().includes(search.toLowerCase()))
  );
  
  const totalNew = enquiries.filter(e => e.status === "NEW").length;
  const totalContacted = enquiries.filter(e => e.status === "CONTACTED").length;

  return (
    <div className="min-h-full" style={{ background: BG, color: "#E8E8F0" }}>
      <div className="sticky top-0 z-10 px-4 sm:px-8 py-4 sm:py-5 border-b flex items-center justify-between gap-3" style={{ background: BG, borderColor: BORDER }}>
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight">Enquiries</h1>
          <p className="text-xs sm:text-sm mt-0.5 hidden sm:block" style={{ color: MUTED }}>Sales leads and contact messages</p>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { label: "Total Leads", value: enquiries.length, icon: Users, color: CYAN },
            { label: "New", value: totalNew, icon: Clock, color: CYAN },
            { label: "Contacted", value: totalContacted, icon: Mail, color: BLUE },
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
          <input className="w-full sm:max-w-sm text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none" style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "#E8E8F0" }} placeholder="Search companies, names..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Desktop: table layout, Mobile: Card Layout */}
        <div className="hidden md:block rounded-2xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-[11px] uppercase tracking-widest" style={{ borderColor: BORDER, color: MUTED }}>
                <th className="px-6 py-4 font-semibold">Prospect</th>
                <th className="px-6 py-4 font-semibold">Company</th>
                <th className="px-6 py-4 font-semibold">Team Size</th>
                <th className="px-6 py-4 font-semibold">Message</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center"><Loader2 className="animate-spin mx-auto" size={26} style={{ color: CYAN }} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <HelpCircle size={24} style={{ color: MUTED }} />
                    <p className="text-sm font-semibold">{search ? "No matching enquiries" : "No enquiries yet"}</p>
                  </div>
                </td></tr>
              ) : filtered.map((enq, i) => (
                <motion.tr
                  key={enq._id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b transition-colors"
                  style={{ borderColor: BORDER }}
                  onMouseEnter={e => (e.currentTarget.style.background = SURFACE2)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="px-6 py-4">
                    <p className="font-bold text-sm">{enq.full_name}</p>
                    <p className="text-[11px] font-mono mt-0.5" style={{ color: MUTED }}>{format(new Date(enq.createdAt), "MMM d, yyyy")}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <Building size={14} style={{ color: MUTED }} />
                       <span className="text-sm font-semibold">{enq.company}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono">{enq.team_size}</td>
                  <td className="px-6 py-4">
                    {enq.message ? (
                      <p className="text-xs text-white/70 max-w-[250px] truncate" title={enq.message}>{enq.message}</p>
                    ) : (
                      <span className="text-xs text-muted italic">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={enq.status} /></td>
                  <td className="px-6 py-4">
                     <div className="flex items-center justify-end gap-2">
                       {enq.status === 'NEW' && (
                         <button onClick={() => updateStatus(enq._id, "CONTACTED")} disabled={actionLoading === enq._id} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-white/5 hover:bg-blue-500/20 hover:text-blue-400 text-white/50" title="Mark as Contacted">
                           {actionLoading === enq._id ? <Loader2 size={14} className="animate-spin" /> : <Reply size={14} />}
                         </button>
                       )}
                       {enq.status !== 'RESOLVED' && (
                         <button onClick={() => updateStatus(enq._id, "RESOLVED")} disabled={actionLoading === enq._id} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 text-white/50" title="Mark as Resolved">
                           {actionLoading === enq._id && enq.status !== 'NEW' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                         </button>
                       )}
                       <button onClick={() => deleteEnquiry(enq._id)} disabled={actionLoading === enq._id} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-white/50" title="Delete">
                          <Trash2 size={14} />
                       </button>
                     </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Mobile View */}
        <div className="block md:hidden space-y-3">
          {filtered.map((enq, i) => (
             <motion.div key={enq._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
               className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
             >
                <div className="flex justify-between items-start">
                   <div>
                      <p className="font-bold text-sm">{enq.full_name}</p>
                      <p className="text-[11px] font-mono mt-0.5" style={{ color: MUTED }}>{enq.company}</p>
                   </div>
                   <StatusBadge status={enq.status} />
                </div>
                {enq.message && <p className="text-sm text-white/80 p-3 rounded-xl bg-white/5 italic">&quot;{enq.message}&quot;</p>}
                
                <div className="pt-2 flex items-center justify-between border-t" style={{ borderColor: BORDER }}>
                   <p className="text-xs" style={{ color: MUTED }}>{format(new Date(enq.createdAt), "MMM d, yyyy")}</p>
                   <div className="flex items-center gap-2">
                       {enq.status === 'NEW' && (
                         <button onClick={() => updateStatus(enq._id, "CONTACTED")} disabled={actionLoading === enq._id} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-white/5 text-white/50" title="Mark as Contacted">
                           <Reply size={14} />
                         </button>
                       )}
                       {enq.status !== 'RESOLVED' && (
                         <button onClick={() => updateStatus(enq._id, "RESOLVED")} disabled={actionLoading === enq._id} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-white/5 text-white/50" title="Mark as Resolved">
                           <CheckCircle size={14} />
                         </button>
                       )}
                       <button onClick={() => deleteEnquiry(enq._id)} disabled={actionLoading === enq._id} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-white/5 text-red-400/50" title="Delete">
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
