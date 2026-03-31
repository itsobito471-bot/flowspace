"use client";

import useSWR from "swr";
import { Users, Clock, AlertCircle, Plane } from "lucide-react";
import { motion } from "framer-motion";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function LiveAttendanceWidget() {
  const { data, error, isLoading } = useSWR("/api/dashboard/today", fetcher, {
    refreshInterval: 60000, // Poll every minute
  });

  const stats = data?.data || { present: 0, late: 0, absent: 0, onLeave: 0 };

  const cards = [
    {
      label: "Present",
      value: stats.present,
      icon: Users,
      color: "text-emerald-500",
      bgBase: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      label: "Late In",
      value: stats.late,
      icon: Clock,
      color: "text-amber-500",
      bgBase: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      label: "Absent",
      value: stats.absent,
      icon: AlertCircle,
      color: "text-red-500",
      bgBase: "bg-red-500/10",
      border: "border-red-500/20",
    },
    {
      label: "On Leave",
      value: stats.onLeave,
      icon: Plane,
      color: "text-cyan",
      bgBase: "bg-cyan/10",
      border: "border-cyan/20",
    },
  ];

  return (
    <div className="w-full">
      <h2 className="text-[12px] font-bold text-foreground mb-4 opacity-80 uppercase tracking-widest flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> Live Today
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
           <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, type: "spring", stiffness: 300, damping: 24 }}
            className={`p-5 rounded-2xl border bg-surface shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group ${card.border}`}
          >
            {/* Subtle glow orb */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none ${card.bgBase}`} />
            
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted/80 mb-1">{card.label}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  {isLoading ? (
                    <div className="h-8 w-12 bg-muted/10 animate-pulse rounded-md" />
                  ) : (
                    <span className={`text-4xl font-black tabular-nums tracking-tighter ${card.color} leading-none`}>
                      {card.value}
                    </span>
                  )}
                </div>
              </div>
              <div className={`p-2.5 rounded-xl ${card.bgBase} ${card.color} border ${card.border} shadow-inner`}>
                <card.icon size={18} strokeWidth={2.5} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
