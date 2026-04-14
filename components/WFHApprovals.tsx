"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertCircle, 
  ChevronRight,
  User,
  Calendar
} from "lucide-react";

export interface WFHRequest {
  _id: string;
  user_id: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    employee_id?: string;
  };
  date: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export default function WFHApprovals() {
  const [requests, setRequests] = useState<WFHRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      const res = await fetch("/api/wfh-requests?status=PENDING");
      const json = await res.json();
      if (json.success) {
        setRequests(json.data);
      } else {
        setError(json.message);
      }
    } catch (e) {
      setError("Failed to fetch WFH requests.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: string, status: "APPROVED" | "REJECTED") {
    setActioningId(id);
    try {
      const res = await fetch(`/api/wfh-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        setRequests((prev) => prev.filter((r) => r._id !== id));
      } else {
        alert(json.message || "Action failed");
      }
    } catch (e) {
      alert("Network error. Please try again.");
    } finally {
      setActioningId(null);
    }
  }

  if (loading) {
    return (
      <div className="bg-surface border border-muted/10 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[200px]">
        <Loader2 size={24} className="text-cyan animate-spin mb-3" />
        <p className="text-xs text-muted font-medium tracking-widest uppercase">Loading pending requests...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-surface border border-muted/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-muted/5 flex items-center justify-center mb-4">
          <CheckCircle2 size={24} className="text-muted/30" />
        </div>
        <p className="text-sm font-bold text-foreground">Inbox Zero</p>
        <p className="text-xs text-muted mt-1">No pending WFH requests to review.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase text-cyan/70 flex items-center gap-2">
          <Home size={13} strokeWidth={2.5} />
          WFH Approvals
        </h3>
        <span className="px-2 py-0.5 rounded-full bg-cyan/10 border border-cyan/20 text-cyan text-[10px] font-bold">
          {requests.length} Pending
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {requests.map((req, idx) => (
            <motion.div
              key={req._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-surface border border-muted/10 rounded-2xl overflow-hidden hover:border-muted/20 transition-all group"
            >
              <div className="p-4 space-y-4">
                {/* User Info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan/20 to-violet/20 border border-white/5 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                      {req.user_id.avatar ? (
                        <img src={req.user_id.avatar} alt={req.user_id.name} className="w-full h-full object-cover" />
                      ) : (
                        req.user_id.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground leading-none">{req.user_id.name}</p>
                      <p className="text-[11px] text-muted mt-1 flex items-center gap-1.5">
                        <Calendar size={10} />
                        Requested for {new Date(req.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div className="bg-muted/5 border border-muted/10 rounded-xl p-3">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-muted/60 mb-1 flex items-center gap-1.5">
                    <Clock size={10} /> Reason
                  </p>
                  <p className="text-xs text-foreground/80 italic leading-relaxed">
                    "{req.reason}"
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleAction(req._id, "APPROVED")}
                    disabled={!!actioningId}
                    className="flex-1 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {actioningId === req._id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(req._id, "REJECTED")}
                    disabled={!!actioningId}
                    className="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {actioningId === req._id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                    Reject
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
