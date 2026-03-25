import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, LogOut, Zap, CreditCard, Menu } from "lucide-react";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user as any).userType !== "SUPER_ADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0A0A0B", color: "#E8E8F0" }}>

      {/* ── Mobile Top Bar ─────────────────────────────────────────────── */}
      <div
        className="lg:hidden flex items-center justify-between px-4 py-3 border-b z-40 sticky top-0"
        style={{ background: "#0F0F11", borderColor: "rgba(255,255,255,0.06)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #00F2FE, #892CDC)" }}
          >
            <Zap size={13} className="text-black" />
          </div>
          <div>
            <span className="text-sm font-black tracking-tight">FlowSpace</span>
            <span className="text-[9px] font-bold ml-1.5" style={{ color: "#00F2FE" }}>SUPER ADMIN</span>
          </div>
        </div>

        {/* Mobile nav links inline */}
        <div className="flex items-center gap-1">
          <Link href="/organizations" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-white/5" style={{ color: "#E8E8F0" }}>
            <Building2 size={13} style={{ color: "#00F2FE" }} />
            <span className="hidden sm:block">Orgs</span>
          </Link>
          <Link href="/plans" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-white/5" style={{ color: "#E8E8F0" }}>
            <CreditCard size={13} style={{ color: "#892CDC" }} />
            <span className="hidden sm:block">Plans</span>
          </Link>
          <Link href="/api/auth/signout" className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-white/5" style={{ color: "#666680" }}>
            <LogOut size={13} />
          </Link>
        </div>
      </div>

      {/* ── Desktop Layout ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — desktop only */}
        <aside
          className="hidden lg:flex w-60 shrink-0 flex-col border-r"
          style={{ background: "#0F0F11", borderColor: "rgba(255,255,255,0.06)" }}
        >
          {/* Logo */}
          <div className="px-5 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #00F2FE, #892CDC)" }}
              >
                <Zap size={15} className="text-black" />
              </div>
              <div>
                <p className="text-sm font-black tracking-tight">FlowSpace</p>
                <p className="text-[10px] font-semibold" style={{ color: "#00F2FE" }}>SUPER ADMIN</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            <Link href="/organizations" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/5" style={{ color: "#E8E8F0" }}>
              <Building2 size={15} style={{ color: "#00F2FE" }} />
              Organizations
            </Link>
            <Link href="/plans" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/5" style={{ color: "#E8E8F0" }}>
              <CreditCard size={15} style={{ color: "#892CDC" }} />
              Subscription Plans
            </Link>
          </nav>

          {/* Footer */}
          <div className="px-3 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="px-3 py-2 mb-1">
              <p className="text-[10px] font-semibold" style={{ color: "#888" }}>Signed in as</p>
              <p className="text-sm font-bold truncate">{(session.user as any).name || session.user.email}</p>
            </div>
            <Link href="/api/auth/signout" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all w-full hover:bg-white/5" style={{ color: "#666680" }}>
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
