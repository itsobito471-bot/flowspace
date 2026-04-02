import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, LogOut, Zap, CreditCard, Menu, MessageSquareQuote, HelpCircle } from "lucide-react";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user as any).userType !== "SUPER_ADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">

      {/* ── Mobile Top Bar ─────────────────────────────────────────────── */}
      <div
        className="lg:hidden flex items-center justify-between px-4 py-3 border-b z-40 sticky top-0 bg-surface"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--cyan), var(--violet))" }}
          >
            <Zap size={13} className="text-black" />
          </div>
          <div>
            <span className="text-sm font-black tracking-tight text-foreground">FlowSpace</span>
            <span className="text-[9px] font-bold ml-1.5" style={{ color: "var(--cyan)" }}>SUPER ADMIN</span>
          </div>
        </div>

        {/* Mobile nav links inline */}
        <div className="flex items-center gap-1">
          <Link href="/organizations" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-muted/10 text-foreground">
            <Building2 size={13} style={{ color: "var(--cyan)" }} />
            <span className="hidden sm:block">Orgs</span>
          </Link>
          <Link href="/plans" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-muted/10 text-foreground">
            <CreditCard size={13} style={{ color: "var(--violet)" }} />
            <span className="hidden sm:block">Plans</span>
          </Link>
          <Link href="/testimonials" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-muted/10 text-foreground">
            <MessageSquareQuote size={13} style={{ color: "var(--cyan)" }} />
            <span className="hidden sm:block">Reviews</span>
          </Link>
          <Link href="/enquiries" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-muted/10 text-foreground">
            <HelpCircle size={13} style={{ color: "var(--cyan)" }} />
            <span className="hidden sm:block">Enquiries</span>
          </Link>
          <Link href="/api/auth/signout" className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-muted/10 text-muted">
            <LogOut size={13} />
          </Link>
        </div>
      </div>

      {/* ── Desktop Layout ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — desktop only */}
        <aside
          className="hidden lg:flex w-60 shrink-0 flex-col border-r bg-surface"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {/* Logo */}
          <div className="px-5 py-5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, var(--cyan), var(--violet))" }}
              >
                <Zap size={15} className="text-black" />
              </div>
              <div>
                <p className="text-sm font-black tracking-tight text-foreground">FlowSpace</p>
                <p className="text-[10px] font-semibold" style={{ color: "var(--cyan)" }}>SUPER ADMIN</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {[
              { href: "/organizations", icon: Building2, label: "Organizations", color: "var(--cyan)" },
              { href: "/plans", icon: CreditCard, label: "Subscription Plans", color: "var(--violet)" },
              { href: "/testimonials", icon: MessageSquareQuote, label: "Testimonials", color: "var(--cyan)" },
              { href: "/enquiries", icon: HelpCircle, label: "Enquiries", color: "var(--cyan)" },
            ].map(({ href, icon: Icon, label, color }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-muted/10 text-foreground"
              >
                <Icon size={15} style={{ color }} />
                {label}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-3 py-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="px-3 py-2 mb-1">
              <p className="text-[10px] font-semibold text-muted">Signed in as</p>
              <p className="text-sm font-bold truncate text-foreground">
                {(session.user as any).name || session.user.email}
              </p>
            </div>
            <Link
              href="/api/auth/signout"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all w-full text-muted hover:text-red-400 hover:bg-red-500/10"
            >
              <LogOut size={14} /> Sign Out
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto min-w-0">{children}</main>
      </div>
    </div>
  );
}
