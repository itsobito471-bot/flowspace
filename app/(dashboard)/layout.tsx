import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
// import TopBar from "@/components/TopBar";
import TopBar from "@/components/TopBar";

/**
 * DashboardLayout
 *
 * The root layout for every authenticated page. Wraps all content with
 * the global Sidebar (and mobile nav) plus the fixed top header bar.
 * Unauthenticated visitors are hard-redirected back to the login page.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Protect ALL dashboard routes – redirect to login if no session exists
  if (!session) {
    redirect("/");
  }

  const userRole = (session.user as any)?.role?.level ?? "EMPLOYEE";
  const userName = session.user?.name ?? "User";

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
      {/* ── Desktop/Mobile Sidebar ── */}
      <Sidebar userRole={userRole} userName={userName} />

      {/* ── Main content column ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Fixed top header */}
        <TopBar userName={userName} userRole={userRole} />

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto relative">
          {/* Subtle ambient glow overlay */}
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-cyan/3 via-transparent to-violet/5 pointer-events-none" />
          <div className="relative z-10 pb-24 md:pb-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
