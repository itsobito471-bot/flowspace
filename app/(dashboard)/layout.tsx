import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-obsidian text-off-white font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col relative overflow-y-auto">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-black/20 via-transparent to-cyan/5 pointer-events-none" />
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
