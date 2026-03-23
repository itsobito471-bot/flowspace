"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft, Loader2, Calendar as CalendarIcon, FileText, CheckSquare, CheckCircle2, XCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CalendarView from "@/components/CalendarView";
import Link from "next/link";

interface EmployeeDetails {
  _id: string;
  name: string;
  email: string;
  role_id: {
    title: string;
    department: string;
    level: string;
} | null;
}

function EmployeeLeavesTab({ employeeId }: { employeeId: string }) {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/leave?userId=${employeeId}&limit=50`)
      .then(res => res.json())
      .then(json => {
        if (json.success) setLeaves(json.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [employeeId]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-cyan" /></div>;

  if (leaves.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted">
      <FileText size={32} strokeWidth={1.2} />
      <p className="text-sm">No leave requests found.</p>
    </div>
  );

  return (
    <div className="bg-surface border border-muted/10 rounded-2xl overflow-hidden mt-4">
      <table className="w-full text-left border-collapse">
        <tbody>
          {leaves.map((leave) => {
            const days = Math.round((new Date(leave.end_date).getTime() - new Date(leave.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const statusColors = {
              PENDING: "bg-amber-400/10 text-amber-400 border-amber-400/20",
              APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
              REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
            };
            const StatusIcon = leave.status === "APPROVED" ? CheckCircle2 : leave.status === "REJECTED" ? XCircle : Clock;
            
            return (
              <tr key={leave._id} className="border-b border-muted/10 hover:bg-muted/5 transition-colors">
                <td className="px-5 py-4 min-w-[150px]">
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    <CalendarIcon size={13} className="text-muted shrink-0" />
                    <span>{new Date(leave.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    {leave.start_date !== leave.end_date && (
                      <><span className="text-muted">–</span><span>{new Date(leave.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 ml-[21px]">
                    <p className="text-[11px] text-muted">{days} day{days !== 1 ? "s" : ""}</p>
                    {leave.leave_type && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-muted/30" />
                        <span className="text-[10px] uppercase font-bold text-cyan">{leave.leave_type}</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 max-w-[200px]">
                  <p className="text-sm text-foreground/80 truncate" title={leave.reason}>{leave.reason}</p>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusColors[leave.status as keyof typeof statusColors]}`}>
                    <StatusIcon size={11} />
                    {leave.status}
                  </span>
                  {leave.is_loss_of_pay && (
                    <span className="ml-1.5 text-[10px] text-red-400 font-semibold">LOP</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const id = params.id as string;

  const [employee, setEmployee] = useState<EmployeeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"CALENDAR" | "LEAVES" | "TASKS">("CALENDAR");

  useEffect(() => {
    // Fetch this user from the main team list to get their role info
    fetch(`/api/team`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          const found = json.data.find((u: any) => u._id === id);
          if (found) setEmployee(found);
        }
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className="flex h-[calc(100vh-theme(spacing.16))] items-center justify-center"><Loader2 size={28} className="text-cyan animate-spin" /></div>;
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-theme(spacing.16))] gap-4">
        <h2 className="text-xl font-bold text-muted">Employee Not Found</h2>
        <button onClick={() => router.back()} className="px-4 py-2 bg-foreground text-background text-sm font-bold rounded-xl active:scale-95 transition-all">Go Back</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[calc(100vh-theme(spacing.16))] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-6 md:px-8 border-b border-muted/10 bg-background flex flex-col gap-6">
        <button onClick={() => router.push('/team')} className="flex items-center gap-2 text-muted hover:text-cyan transition-colors w-fit text-sm font-semibold">
          <ChevronLeft size={16} /> Back to Team
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan/20 to-violet/20 border border-cyan/20 flex items-center justify-center text-xl font-black text-cyan shadow-sm">
              {employee.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">{employee.name}</h1>
              <p className="text-muted text-sm font-medium">{employee.role_id?.title || "No Role"} · {employee.role_id?.department || "No Department"}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 mt-2">
          <button
            onClick={() => setActiveTab("CALENDAR")}
            className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 ${activeTab === "CALENDAR" ? "border-cyan text-cyan" : "border-transparent text-muted hover:text-foreground"}`}
          >
            <div className="flex items-center gap-2"><CalendarIcon size={16} /> Attendance</div>
          </button>
          <button
            onClick={() => setActiveTab("LEAVES")}
            className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 ${activeTab === "LEAVES" ? "border-cyan text-cyan" : "border-transparent text-muted hover:text-foreground"}`}
          >
            <div className="flex items-center gap-2"><FileText size={16} /> Leaves</div>
          </button>
          <button
            onClick={() => setActiveTab("TASKS")}
            className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 ${activeTab === "TASKS" ? "border-cyan text-cyan" : "border-transparent text-muted hover:text-foreground"}`}
          >
            <div className="flex items-center gap-2"><CheckSquare size={16} /> Tasks</div>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-surface/30">
        <AnimatePresence mode="wait">
          {activeTab === "CALENDAR" && (
            <motion.div key="cal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full">
              {/* Reuse CalendarView */}
              <CalendarView employeeId={employee._id} />
            </motion.div>
          )}

          {activeTab === "LEAVES" && (
            <motion.div key="leaves" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full">
              <EmployeeLeavesTab employeeId={employee._id} />
            </motion.div>
          )}

          {activeTab === "TASKS" && (
            <motion.div key="tasks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center justify-center h-48 text-muted">
              <CheckSquare size={32} className="mb-4 opacity-50" />
              <p className="text-sm font-medium">Task assignments view coming soon.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
