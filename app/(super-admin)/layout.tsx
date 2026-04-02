import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, LogOut, Zap, CreditCard, MessageSquareQuote, HelpCircle } from "lucide-react";

const BG = "#0A0A0B";
const SURFACE = "#161618";
const BORDER = "rgba(255,255,255,0.07)";
const CYAN = "#00F2FE";
const VIOLET = "#892CDC";
const MUTED = "#666680";

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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: BG, color: "#E8E8F0" }}>

      {/* ── Mobile Top Bar ─────────────────────────────────────────────── */}
      <div
        className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-40"
        style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}` }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})` }}
          >
            <Zap size={13} className="text-black" />
          </div>
          <div>
            <span className="text-sm font-black tracking-tight" style={{ color: "#E8E8F0" }}>FlowSpace</span>
            <span className="text-[9px] font-bold ml-1.5" style={{ color: CYAN }}>SUPER ADMIN</span>
          </div>
        </div>

        {/* Mobile nav links inline */}
        <div className="flex items-center gap-1">
          {NAV.map(({ href, icon: Icon, label, color }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-white/5"
              style={{ color: MUTED }}
            >
              <Icon size={13} style={{ color }} />
              <span className="hidden sm:block">{label.split(" ")[0]}</span>
            </Link>
          ))}
          <Link href="/api/auth/signout?callbackUrl=/login" className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-white/5" style={{ color: MUTED }}>
            <LogOut size={13} />
          </Link>
        </div>
      </div>

      {/* ── Desktop Layout ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — desktop only */}
        <aside
          className="hidden lg:flex flex-col shrink-0"
          style={{ width: 240, borderRight: `1px solid ${BORDER}`, background: SURFACE }}
        >
          {/* Logo */}
          <div className="px-5 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})` }}
              >
                <Zap size={15} className="text-black" />
              </div>
              <div>
                <p className="text-sm font-black tracking-tight" style={{ color: "#E8E8F0" }}>FlowSpace</p>
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/5"
                style={{ color: MUTED }}
                onMouseEnter={undefined}
              >
                <Icon size={15} style={{ color }} />
                {label}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-3 py-4" style={{ borderTop: `1px solid ${BORDER}` }}>
            <div className="px-3 py-2 mb-1">
              <p className="text-[10px] font-semibold" style={{ color: MUTED }}>Signed in as</p>
              <p className="text-sm font-bold truncate" style={{ color: "#E8E8F0" }}>
                {(session.user as any).name || session.user.email}
              </p>
            </div>
            <Link
              href="/api/auth/signout?callbackUrl=/login"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all w-full hover:bg-red-500/10"
              style={{ color: MUTED }}
            >
              <LogOut size={14} /> Sign Out
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto min-w-0" style={{ background: BG }}>{children}</main>
      </div>
    </div>
  );
}
