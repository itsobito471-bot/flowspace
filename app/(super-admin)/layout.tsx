import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, LogOut, Zap, CreditCard, MessageSquareQuote, HelpCircle, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const CYAN = "#00F2FE";
const VIOLET = "#892CDC";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user as any).userType !== "SUPER_ADMIN") {
    redirect("/");
  }

  const NAV = [
    { href: "/organizations", icon: Building2, label: "Organizations", color: CYAN },
    { href: "/plans", icon: CreditCard, label: "Subscription Plans", color: VIOLET },
    { href: "/testimonials", icon: MessageSquareQuote, label: "Testimonials", color: CYAN },
    { href: "/enquiries", icon: HelpCircle, label: "Enquiries", color: CYAN },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">

      {/* ── Mobile Top Bar ─────────────────────────────────────────────── */}
      <div
        className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-40 bg-surface border-b border-muted/20"
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})` }}
          >
            <Zap size={13} className="text-black inline-block" />
          </div>
          <div>
            <span className="text-sm font-black tracking-tight text-foreground">FlowSpace</span>
            <span className="text-[9px] font-bold ml-1.5" style={{ color: CYAN }}>SUPER ADMIN</span>
          </div>
        </div>

        {/* Mobile nav links inline */}
        <div className="flex items-center gap-1">
          {NAV.map(({ href, icon: Icon, label, color }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-black/5 dark:hover:bg-white/5 text-muted"
            >
              <Icon size={14} style={{ color }} />
              <span className="hidden sm:block">{label.split(" ")[0]}</span>
            </Link>
          ))}
          <div className="w-[1px] h-4 mx-1.5 bg-muted/20" />
          <ThemeToggle className="w-8 h-8 hover:bg-black/5 dark:hover:bg-white/5" iconSize={14} />
          <Link href="/api/auth/signout?callbackUrl=/login" className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-black/5 dark:hover:bg-white/5 text-muted">
            <LogOut size={14} />
          </Link>
        </div>
      </div>

      {/* ── Desktop Layout ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — desktop only */}
        <aside
          className="hidden lg:flex flex-col shrink-0 w-[240px] bg-surface border-r border-muted/20"
        >
          {/* Logo */}
          <div className="px-5 py-5 border-b border-muted/20">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})` }}
              >
                <Zap size={15} className="text-black inline-block" />
              </div>
              <div>
                <p className="text-sm font-black tracking-tight text-foreground">FlowSpace</p>
                <p className="text-[10px] font-semibold" style={{ color: CYAN }}>SUPER ADMIN</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV.map(({ href, icon: Icon, label, color }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-black/5 dark:hover:bg-white/5 text-muted"
              >
                <Icon size={15} style={{ color }} />
                {label}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-3 py-4 border-t border-muted/20">
            <div className="px-3 py-2 mb-1 flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-[10px] font-semibold text-muted">Signed in as</p>
                <p className="text-sm font-bold truncate text-foreground">
                  {(session.user as any).name || session.user.email}
                </p>
              </div>
              <ThemeToggle className="w-8 h-8 shrink-0 hover:bg-black/5 dark:hover:bg-white/5" iconSize={15} />
            </div>
            <Link
              href="/api/auth/signout?callbackUrl=/login"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all w-full hover:bg-red-500/10 hover:text-red-500 text-muted"
            >
              <LogOut size={14} /> Sign Out
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto min-w-0 bg-background">{children}</main>
      </div>
    </div>
  );
}
