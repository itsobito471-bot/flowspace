"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Bell, Check, CheckCheck, Calendar, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface AppNotification {
  _id: string;
  type: "LEAVE_REQUEST" | "LEAVE_APPROVED" | "LEAVE_REJECTED";
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const TYPE_COLORS = {
  LEAVE_REQUEST: "text-cyan bg-cyan/10 border-cyan/20",
  LEAVE_APPROVED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  LEAVE_REJECTED: "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data);
        setUnreadCount(json.unreadCount);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  async function markOne(id: string, link: string) {
    // Optimistically mark as read
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    setOpen(false);

    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});

    router.push(link);
  }

  async function markAllRead() {
    if (unreadCount === 0) return;
    setMarking(true);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    setMarking(false);
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative text-muted hover:text-foreground transition-colors p-1"
        title="Notifications"
      >
        <Bell size={18} strokeWidth={1.8} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-cyan rounded-full flex items-center justify-center text-[9px] font-black text-[#0A0A0B] leading-none"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute right-0 top-full mt-2 w-80 bg-surface border border-muted/15 rounded-2xl shadow-[0_16px_60px_rgba(0,0,0,0.4)] overflow-hidden z-50"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-muted/10">
              <div className="flex items-center gap-2">
                <Bell size={13} className="text-muted" />
                <span className="text-sm font-bold text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-black text-cyan bg-cyan/10 border border-cyan/20 px-1.5 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    disabled={marking}
                    className="text-[11px] font-semibold text-muted hover:text-cyan flex items-center gap-1 transition-colors disabled:opacity-50"
                    title="Mark all read"
                  >
                    <CheckCheck size={12} />
                    All read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground ml-1">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-[380px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted">
                  <Bell size={24} strokeWidth={1.2} />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n, i) => (
                  <motion.button
                    key={n._id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => markOne(n._id, n.link)}
                    className={`w-full text-left flex gap-3 px-4 py-3.5 border-b border-muted/5 last:border-0 hover:bg-muted/5 transition-colors ${
                      !n.is_read ? "bg-cyan/[0.03]" : ""
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${TYPE_COLORS[n.type]}`}>
                      <Calendar size={12} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-[12px] font-bold leading-snug ${!n.is_read ? "text-foreground" : "text-foreground/70"}`}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted leading-snug mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted/50 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </motion.button>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-muted/10 text-center">
                <button
                  onClick={() => { setOpen(false); router.push("/leave"); }}
                  className="text-[11px] font-semibold text-muted hover:text-cyan transition-colors"
                >
                  View all leave requests →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
