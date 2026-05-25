"use client";

import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import OvertimeApprovals from "@/components/admin/OvertimeApprovals";
import EmployeeOvertimeList from "@/src/components/employee/EmployeeOvertimeList";

export default function OvertimePage() {
  const { data: session, status } = useSession();
  const isAdmin = (session?.user as any)?.role?.level === "ADMIN";

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center min-h-[50vh]">
        <Loader2 size={28} className="text-cyan animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6"
    >
      <div className="bg-surface border border-muted/10 rounded-3xl p-6 sm:p-8 shadow-sm">
        {isAdmin ? <OvertimeApprovals /> : <EmployeeOvertimeList />}
      </div>
    </motion.div>
  );
}
