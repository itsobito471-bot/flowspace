"use client";

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import CalendarView from "@/components/CalendarView";

export default function CalendarPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="flex h-full items-center justify-center"><Loader2 size={28} className="text-cyan animate-spin" /></div>;
  }

  if (!session?.user) return null;

  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 size={28} className="text-cyan animate-spin" /></div>}>
      <div className="p-4 md:p-8 h-[calc(100vh-theme(spacing.16))] overflow-y-auto">
        <CalendarView employeeId={(session.user as any).id} />
      </div>
    </Suspense>
  )
}
