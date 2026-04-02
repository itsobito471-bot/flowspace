"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Calendar,
  CalendarDays,
  BarChart2,
  Settings,
  LogOut,
  User,
  Zap,
  ShieldAlert,
  Menu,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────
interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

interface SidebarProps {
  /** The authenticated user's role pulled from the NextAuth session */
  userRole?: string;
  userName?: string;
  userDepartment?: string;
  userImage?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Nav Items Config
// ─────────────────────────────────────────────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", href: "/home", icon: LayoutDashboard },
  { name: "Team", href: "/team", icon: Users },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Calendar", href: "/calendar", icon: CalendarDays },
  { name: "Leave Requests", href: "/leave", icon: Calendar },
  { name: "Reports", href: "/reports", icon: BarChart2 },
  /**
   * The "Admin Panel" item is flagged adminOnly: true.
   * It will only be rendered when userRole === "ADMIN".
   */
  // { name: "Admin Panel", href: "/admin", icon: ShieldAlert, adminOnly: true },
];

// ─────────────────────────────────────────────────────────────────────────────
//  Desktop Sidebar
// ─────────────────────────────────────────────────────────────────────────────
function DesktopSidebar({ userRole, userName, userDepartment }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || userRole === "ADMIN"
  );

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="hidden md:flex h-screen flex-col justify-between relative
                 bg-background/80 backdrop-blur-2xl border-r border-muted/10
                 overflow-hidden shrink-0"
    >
      {/* ── Header ── */}
      <div>
        <div className="flex items-center justify-between px-5 pt-6 pb-4">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-0.5"
            >
              <div className="flex items-center gap-2">
                {/* Diamond logo mark */}
                <div className="w-6 h-6 bg-cyan rotate-45 relative flex-shrink-0">
                  <div className="w-2 h-2 bg-background absolute -left-0.5 -bottom-0.5 rotate-45" />
                </div>
                <span className="text-foreground font-bold text-base tracking-tight">FlowSpace</span>
              </div>
              <p className="text-[10px] text-muted tracking-[0.18em] uppercase pl-8 font-semibold">
                {userRole === "ADMIN" ? "Admin Console" : "Workspace"}
              </p>
            </motion.div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted hover:text-foreground transition-colors ml-auto"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <Menu size={20} /> : <X size={18} />}
          </button>
        </div>

        {/* ── Nav ── */}
        <nav className="mt-4 px-3 space-y-1">
          {visibleItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link key={item.name} href={item.href}>
                <motion.div
                  whileHover={{ x: 3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                    ${collapsed ? "justify-center" : ""}
                    ${isActive
                      ? "bg-cyan/10 text-cyan border border-cyan/20"
                      : "text-muted hover:text-foreground hover:bg-muted/10 border border-transparent"
                    }`}
                >
                  <item.icon
                    size={18}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={isActive ? "text-cyan" : ""}
                  />
                  {!collapsed && (
                    <span
                      className={`text-sm font-semibold tracking-tight truncate ${isActive ? "text-cyan" : ""
                        }`}
                    >
                      {item.name}
                    </span>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Footer ── */}
      <div className="px-3 pb-6 space-y-4">
        {/* Pro Plan badge */}
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-0 p-3 rounded-xl bg-surface/50 border border-muted/10"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <Zap size={14} className="text-cyan" />
              <span className="text-[11px] font-bold tracking-widest uppercase text-foreground">
                Pro Plan
              </span>
            </div>
            <p className="text-[10px] text-muted mb-2">Syncing across 12 nodes</p>
            {/* Progress bar */}
            <div className="h-0.5 bg-muted/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan to-violet rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "72%" }}
                transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        )}

        {/* Settings */}
        {userRole === "ADMIN" && (
          <Link href="/settings">
            <div
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-muted hover:text-foreground hover:bg-muted/10 ${collapsed ? "justify-center" : ""
                }`}
            >
              <Settings size={18} strokeWidth={1.8} />
              {!collapsed && (
                <span className="text-sm font-semibold">Settings</span>
              )}
            </div>
          </Link>
        )}

        {/* Profile Settings */}
        <Link href="/profile">
          <div
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-muted hover:text-cyan hover:bg-cyan/10 border border-transparent hover:border-cyan/20 ${collapsed ? "justify-center" : ""
              }`}
          >
            <User size={18} strokeWidth={1.8} />
            {!collapsed && (
              <span className="text-sm font-semibold">My Profile</span>
            )}
          </div>
        </Link>

        {/* Logout */}
        <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all 
            text-red-500/70 hover:text-red-500 hover:bg-red-500/10 ${collapsed ? "justify-center" : ""
            }`}
        >
          <LogOut size={18} strokeWidth={1.8} />
          {!collapsed && (
            <span className="text-sm font-semibold">Disconnect</span>
          )}
        </button>
      </div>
    </motion.aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Mobile Bottom Nav / Hamburger
// ─────────────────────────────────────────────────────────────────────────────
function MobileSidebar({ userRole, userName }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || userRole === "ADMIN"
  );

  return (
    <>
      {/* ── Bottom Nav (always visible on mobile) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-muted/10 px-2 py-2 flex items-center justify-around">
        {visibleItems.slice(0, 4).map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${isActive ? "text-cyan" : "text-muted"
                  }`}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[9px] font-bold tracking-wide">{item.name}</span>
              </div>
            </Link>
          );
        })}

        {/* "More" button to open slide-out sheet */}
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-center gap-1 px-3 py-1.5 text-muted"
        >
          <Menu size={20} strokeWidth={1.8} />
          <span className="text-[9px] font-bold tracking-wide">More</span>
        </button>
      </nav>

      {/* ── Slide-out Drawer ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="md:hidden fixed left-0 top-0 bottom-0 z-50 w-72 bg-background border-r border-muted/10 flex flex-col p-6"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-cyan rotate-45 relative flex-shrink-0">
                    <div className="w-2 h-2 bg-background absolute -left-0.5 -bottom-0.5 rotate-45" />
                  </div>
                  <span className="text-foreground font-bold text-base tracking-tight">FlowSpace</span>
                </div>
                <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground transition-colors">
                  <X size={20} />
                </button>
              </div>

              <nav className="space-y-2 flex-1">
                {visibleItems.map((item) => {
                  const isActive = pathname?.startsWith(item.href);
                  return (
                    <Link key={item.name} href={item.href} onClick={() => setOpen(false)}>
                      <div
                        className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-all ${isActive
                            ? "bg-cyan/10 text-cyan border-cyan/20"
                            : "text-muted hover:text-foreground hover:bg-muted/10 border-transparent"
                          }`}
                      >
                        <item.icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
                        <span className="text-sm font-semibold">{item.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>

              <div className="space-y-2 mt-4">
                {userRole === "ADMIN" && (
                  <Link href="/settings" onClick={() => setOpen(false)}>
                    <div className="flex items-center gap-4 px-4 py-3 rounded-xl border border-transparent text-muted hover:text-foreground hover:bg-muted/10 transition-all">
                      <Settings size={18} />
                      <span className="text-sm font-semibold">Settings</span>
                    </div>
                  </Link>
                )}

                <Link href="/profile" onClick={() => setOpen(false)}>
                  <div className="flex items-center gap-4 px-4 py-3 rounded-xl border border-transparent text-muted hover:text-cyan hover:bg-cyan/10 transition-all">
                    <User size={18} />
                    <span className="text-sm font-semibold">My Profile</span>
                  </div>
                </Link>

                <button
                          onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-all"
                >
                  <LogOut size={18} />
                  <span className="text-sm font-semibold">Disconnect</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Unified Export: renders both, each handles its own breakpoint visibility
// ─────────────────────────────────────────────────────────────────────────────
export default function Sidebar(props: SidebarProps) {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...props} />
    </>
  );
}

