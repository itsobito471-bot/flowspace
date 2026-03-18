"use client";

import { Bell, Search } from "lucide-react";
import { motion } from "framer-motion";

interface TopBarProps {
  userName: string;
  userRole: string;
}

/**
 * TopBar
 *
 * Fixed header across all dashboard pages. Shows a search bar, notification
 * bell, and the current user's name + role in a pill on the right.
 */
export default function TopBar({ userName, userRole }: TopBarProps) {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const displayRole = userRole === "ADMIN" ? "System Administrator" : "Employee";

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="h-16 shrink-0 px-6 flex items-center justify-between
                 bg-[#111113]/60 backdrop-blur-xl border-b border-white/5
                 relative z-40"
    >
      {/* ── Search ── */}
      <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-full px-4 py-2 w-full max-w-sm group focus-within:border-cyan/30 transition-colors">
        <Search size={14} className="text-muted group-focus-within:text-cyan transition-colors" />
        <input
          type="text"
          placeholder="Search Command Center..."
          className="bg-transparent text-sm text-off-white placeholder:text-muted/50 focus:outline-none w-full"
        />
      </div>

      {/* ── Right side ── */}
      <div className="flex items-center gap-4 ml-6">
        {/* Notification bell */}
        <button className="relative text-muted hover:text-white transition-colors">
          <Bell size={18} strokeWidth={1.8} />
          {/* Badge */}
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan rounded-full" />
        </button>

        {/* User pill */}
        <div className="flex items-center gap-3 pl-4 border-l border-white/10">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-off-white leading-none">{userName}</p>
            <p className="text-[10px] text-muted tracking-[0.12em] uppercase mt-0.5">{displayRole}</p>
          </div>

          {/* Avatar circle */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan/40 to-violet/40 border border-cyan/20 flex items-center justify-center text-sm font-bold text-white">
            {initials}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
