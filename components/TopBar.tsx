"use client";

import { Bell, Search, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface TopBarProps {
  userName: string;
  userRole: string;
}

export default function TopBar({ userName, userRole }: TopBarProps) {
  const { theme, setTheme } = useTheme();
  // Prevent hydration mismatch for theme toggle icon
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
                 bg-background/80 backdrop-blur-xl border-b border-muted/10
                 relative z-40"
    >
      {/* ── Search ── */}
      <div className="flex items-center gap-3 bg-muted/5 border border-muted/10 rounded-full px-4 py-2 w-full max-w-sm group focus-within:border-cyan/30 transition-colors">
        <Search size={14} className="text-muted group-focus-within:text-cyan transition-colors" />
        <input
          type="text"
          placeholder="Search Command Center..."
          className="bg-transparent text-sm text-foreground placeholder:text-muted/50 focus:outline-none w-full"
        />
      </div>

      {/* ── Right side ── */}
      <div className="flex items-center gap-4 ml-6">
        
        {/* Theme Toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-muted hover:text-foreground transition-colors p-1"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
          </button>
        )}

        {/* Notification bell */}
        <button className="relative text-muted hover:text-foreground transition-colors p-1">
          <Bell size={18} strokeWidth={1.8} />
          <span className="absolute top-0 right-0 w-2 h-2 bg-cyan rounded-full" />
        </button>

        {/* User pill */}
        <div className="flex items-center gap-3 pl-4 border-l border-muted/20">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-foreground leading-none">{userName}</p>
            <p className="text-[10px] text-muted tracking-[0.12em] uppercase mt-0.5">{displayRole}</p>
          </div>

          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan/40 to-violet/40 border border-cyan/20 flex items-center justify-center text-sm font-bold text-white">
            {initials}
          </div>
        </div>
      </div>
    </motion.header>
  );
}

