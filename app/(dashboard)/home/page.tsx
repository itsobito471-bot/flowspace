import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";

/**
 * HomePage (Dashboard)
 *
 * The first page users land on after login. Sits inside the
 * (dashboard) route group so it inherits the Sidebar + TopBar layout.
 */
export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const name = session?.user?.name ?? "there";
  const firstName = name.split(" ")[0];

  return (
    <div className="p-8 lg:p-10">
      {/* ── Welcome Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter leading-none">
            Welcome back, {firstName}.
          </h1>
          <p className="mt-2 text-muted text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan rounded-full animate-pulse inline-block" />
            The Command Center is fully operational. All systems nominal.
          </p>
        </div>

        {/* Attendance KPI */}
        <div className="bg-[#161618] border border-white/5 rounded-2xl px-6 py-4 flex flex-col gap-1 min-w-[190px]">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted">
            Today's Attendance
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">95%</span>
            <span className="text-xs text-cyan font-bold">+2.4%</span>
          </div>
          <p className="text-[10px] text-muted">checked in</p>
          {/* Progress bar */}
          <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full w-[95%] bg-gradient-to-r from-cyan to-violet rounded-full" />
          </div>
        </div>
      </div>

      {/* ── Cards Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Overview */}
        <div className="bg-[#161618] border border-white/5 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-white text-base">Task Overview</h2>
          </div>
          <div className="flex items-center justify-center">
            {/* Circular progress placeholder */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90 w-full h-full">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="40"
                  fill="none"
                  stroke="url(#grad)"
                  strokeWidth="10"
                  strokeDasharray="251.2"
                  strokeDashoffset="100"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00F2FE" />
                    <stop offset="100%" stopColor="#892CDC" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="text-center">
                <span className="block text-3xl font-black text-white">124</span>
                <span className="text-[10px] text-muted uppercase tracking-widest">Active Tasks</span>
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "In Progress", count: 64, color: "bg-cyan" },
              { label: "Completed", count: 42, color: "bg-violet" },
              { label: "Pending", count: 18, color: "bg-white/30" },
              { label: "Overdue", count: 2, color: "bg-red-500" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${stat.color}`} />
                <span className="text-muted text-xs">{stat.label} ({stat.count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-[#161618] border border-white/5 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-white text-base">Recent Activity Feed</h2>
            <button className="text-[10px] font-bold tracking-widest uppercase text-cyan hover:underline">
              View History
            </button>
          </div>
          <div className="space-y-4">
            {[
              { text: "Sarah Chen joined the design team", time: "2 minutes ago • San Francisco Hub" },
              { text: "Project Alpha documentation updated by Marcus", time: "45 minutes ago • Cloud Storage" },
              { text: "Sprint 24 successfully deployed to production", time: "2 hours ago • CI/CD Pipeline" },
              { text: "New feedback received for UI Redesign", time: "5 hours ago • Internal Forum" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 pb-4 border-b border-white/5 last:border-0 last:pb-0">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex-shrink-0 flex items-center justify-center mt-0.5">
                  <span className="text-xs text-cyan font-bold">{i + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-off-white leading-snug">{item.text}</p>
                  <p className="text-[10px] text-muted mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
