"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, CheckSquare, Clock, Settings, Menu, X, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: "Hub", href: "/home", icon: LayoutDashboard },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Timesheet", href: "/timesheet", icon: Clock },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <motion.aside
      initial={{ width: 280 }}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="h-full z-50 bg-[#161618]/60 backdrop-blur-2xl border-r border-white/5 flex flex-col justify-between py-8 relative"
    >
      <div className="px-6">
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <div className="w-6 h-6 bg-cyan relative rotate-45 flex flex-shrink-0 items-center justify-center">
                <div className="w-2 h-2 bg-obsidian absolute -left-0.5 -bottom-0.5 rotate-45" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">FlowSpace</span>
            </motion.div>
          )}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted hover:text-white transition-colors"
          >
            {collapsed ? <Menu size={24} /> : <X size={24} />}
          </button>
        </div>

        <nav className="mt-12 space-y-4">
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link key={item.name} href={item.href}>
                <div className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${
                  isActive ? "bg-cyan/10 text-cyan border border-cyan/20" : "text-muted hover:text-white hover:bg-white/5"
                } ${collapsed ? "justify-center" : ""}`}>
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {!collapsed && <span className={`font-semibold text-sm ${isActive ? "text-cyan" : ""}`}>{item.name}</span>}
                </div>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="px-6">
         <button 
            onClick={() => signOut({ callbackUrl: '/' })}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-red-500/80 hover:text-red-500 hover:bg-red-500/10 transition-all ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut size={20} />
            {!collapsed && <span className="font-semibold text-sm">Disconnect</span>}
          </button>
      </div>
    </motion.aside>
  );
}
