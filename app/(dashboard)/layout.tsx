import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import SuspendGuard from "@/components/SuspendGuard";

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

  // 🚨 2. SERVER-SIDE LOCK: If they hard-refresh the page and are suspended, kick them instantly!
  if (session && (session as any).error === "SUSPENDED") {
    redirect("/?error=suspended");
  }

  // Protect ALL dashboard routes – redirect to login if no valid session/user exists
  if (!session || !session.user) {
    redirect("/");
  }

  const userRole = (session.user as any)?.role?.level ?? "EMPLOYEE";
  const userName = session.user?.name ?? "User";
  const userImage = session.user?.image ?? null;

  return (
    // 🚨 3. CLIENT-SIDE LOCK: Wrap the whole app in the Bouncer to watch them while they browse
    <SuspendGuard>
      <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
        {/* ── Desktop/Mobile Sidebar ── */}
        <Sidebar userRole={userRole} userName={userName} userImage={userImage} />

        {/* ── Main content column ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Fixed top header */}
          <TopBar userName={userName} userRole={userRole} userImage={userImage} />

          {/* Scrollable page content */}
          <main className="flex-1 overflow-y-auto relative">
            {/* Subtle ambient glow overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan/3 via-transparent to-violet/5 pointer-events-none" />
            <div className="relative pb-24 md:pb-0">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SuspendGuard>
  );
}