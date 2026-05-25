"use client";

import { Search, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";
import GlobalTimer from "@/components/GlobalTimer";

interface TopBarProps {
  userName: string;
  userRole: string;
  userImage?: string | null;
}

export default function TopBar({ userName, userRole, userImage }: TopBarProps) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
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
      <div className="flex items-center gap-3 bg-muted/5 border border-muted/10 rounded-full px-4 py-2 flex-1 min-w-0 max-w-sm group focus-within:border-cyan/30 transition-colors">
        <Search size={14} className="text-muted group-focus-within:text-cyan transition-colors shrink-0" />
        <input
          type="text"
          placeholder="Search Command Center..."
          className="bg-transparent text-sm text-foreground placeholder:text-muted/50 focus:outline-none w-full min-w-0"
        />
      </div>

      {/* ── Right side ── */}
      <div className="flex items-center gap-3 ml-3 sm:gap-4 sm:ml-6 shrink-0">
        
        {/* Global Timer Widget - Rendered only on /tasks page */}
        {pathname === "/tasks" && <GlobalTimer />}

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
        <NotificationBell />

        {/* User pill */}
        <Link href="/profile">
          <div className="flex items-center gap-2 sm:gap-3 pl-3 sm:pl-4 border-l border-muted/20 cursor-pointer group">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-foreground leading-none group-hover:text-cyan transition-colors">{userName}</p>
              <p className="text-[10px] text-muted tracking-[0.12em] uppercase mt-0.5">{displayRole}</p>
            </div>

            {userImage ? (
              <img src={userImage} alt={userName} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-muted/20 group-hover:border-cyan/40 transition-colors" />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-cyan/40 to-violet/40 border border-cyan/20 flex items-center justify-center text-sm font-bold text-white group-hover:shadow-[0_0_15px_rgba(45,212,191,0.4)] transition-all shrink-0">
                {initials}
              </div>
            )}
          </div>
        </Link>
      </div>
    </motion.header>
  );
}

