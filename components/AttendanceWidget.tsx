"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, LogIn, LogOut, CheckCircle2, Loader2 } from "lucide-react";
import ErrorModal from "@/components/ErrorModal";

export default function AttendanceWidget() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [allowMultiCheckins, setAllowMultiCheckins] = useState<boolean>(false);
  const [totalPreviousSeconds, setTotalPreviousSeconds] = useState<number>(0);
  const [liveDuration, setLiveDuration] = useState<number>(0);
  const [errorInfo, setErrorInfo] = useState<{title: string; message: string} | null>(null);

  useEffect(() => {
    fetch("/api/attendance/today")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          if (json.data) setRecord(json.data);
          if (json.allow_multi_checkins !== undefined) setAllowMultiCheckins(json.allow_multi_checkins);
          if (json.total_previous_seconds !== undefined) setTotalPreviousSeconds(json.total_previous_seconds);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (record?.check_in && !record?.check_out) {
      const checkInTime = new Date(record.check_in).getTime();
      
      const updateClock = () => {
        const now = Date.now();
        const currentSessionSeconds = Math.floor((now - checkInTime) / 1000);
        setLiveDuration(totalPreviousSeconds + currentSessionSeconds);
      };
      
      updateClock(); // Initial update
      interval = setInterval(updateClock, 1000);
    } else if (record?.check_in && record?.check_out) {
      const checkInTime = new Date(record.check_in).getTime();
      const checkOutTime = new Date(record.check_out).getTime();
      const currentSessionSeconds = Math.floor((checkOutTime - checkInTime) / 1000);
      setLiveDuration(totalPreviousSeconds + currentSessionSeconds);
    } else {
      setLiveDuration(totalPreviousSeconds);
    }
    
    return () => clearInterval(interval);
  }, [record, totalPreviousSeconds]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getCoordinates = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null), // Silently catch Denied / Error
        { timeout: 5000, enableHighAccuracy: false } // Fast 5s timeout fallback
      );
    });
  };

  const handleAction = async (action: "CHECK_IN" | "CHECK_OUT") => {
    setActionLoading(true);
    try {
      const location = await getCoordinates();
      const res = await fetch("/api/attendance/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, location }),
      });
      const json = await res.json();
      if (!json.success) {
        setErrorInfo({ title: "Action Failed", message: json.message });
        return;
      }
      if (json.data) setRecord(json.data);
      if (json.total_previous_seconds !== undefined) setTotalPreviousSeconds(json.total_previous_seconds);
    } catch (e: any) {
      setErrorInfo({ title: "Network Error", message: "Failed to communicate with server." });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-surface border border-muted/10 rounded-2xl px-6 py-6 flex items-center justify-center min-w-[240px] min-h-[140px] shadow-lg">
        <Loader2 className="animate-spin text-cyan" />
      </div>
    );
  }

  const isCheckedIn = record?.check_in && !record?.check_out;
  const isCheckedOut = record?.check_in && record?.check_out;

  return (
    <>
      <ErrorModal
        open={!!errorInfo}
        title={errorInfo?.title || ""}
        message={errorInfo?.message || ""}
        onClose={() => setErrorInfo(null)}
      />
      <div className="bg-surface border border-muted/10 rounded-2xl p-5 flex flex-col justify-between min-w-[280px] shadow-lg relative overflow-hidden">
        {/* Glow effect when active */}
        {isCheckedIn && (
          <div className="absolute inset-0 bg-cyan/5 pointer-events-none animate-pulse duration-1000" />
        )}
        
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted mb-1.5 flex items-center gap-2">
              Today's Session
              {isCheckedIn && <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />}
            </p>
            <div className="flex items-baseline gap-2 font-mono">
              <span className={`text-[40px] leading-none font-black tracking-tight ${isCheckedIn ? "text-cyan drop-shadow-[0_0_10px_rgba(45,212,191,0.3)]" : "text-foreground"}`}>
                {formatTime(liveDuration)}
              </span>
            </div>
            <p className="text-[10px] text-muted uppercase tracking-widest mt-1">
              {isCheckedIn ? "recording live..." : (isCheckedOut ? "shift finalized" : "ready to start")}
            </p>
            {record?.check_in && (
              <div className="flex items-center gap-3 mt-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold tracking-widest uppercase text-muted/60">In</span>
                  <span className="text-[12px] font-bold text-cyan/80 font-mono">
                    {new Date(record.check_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                  </span>
                </div>
                {record?.check_out && (
                  <>
                    <span className="text-muted/30 text-xs">·</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold tracking-widest uppercase text-muted/60">Out</span>
                      <span className="text-[12px] font-bold text-rose-400/80 font-mono">
                        {new Date(record.check_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${isCheckedIn ? "bg-cyan/10 text-cyan border border-cyan/20" : "bg-muted/5 text-muted border border-muted/10"}`}>
            <Clock size={20} strokeWidth={2} />
          </div>
        </div>

        <div className="relative z-10 w-full space-y-2">
          {(!record?.check_in || (isCheckedOut && allowMultiCheckins)) && (
            <button
              onClick={() => handleAction("CHECK_IN")}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-background bg-foreground hover:bg-muted-foreground disabled:opacity-50 transition-all shadow-md"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><LogIn size={16} /> {isCheckedOut ? "Punch In Again" : "Punch In"}</>}
            </button>
          )}

          {isCheckedIn && (
            <button
              onClick={() => handleAction("CHECK_OUT")}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(244,63,94,0.2)] hover:shadow-[0_0_25px_rgba(244,63,94,0.35)]"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><LogOut size={16} /> Punch Out</>}
            </button>
          )}

          {isCheckedOut && !allowMultiCheckins && (
            <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 shadow-inner">
              <CheckCircle2 size={16} /> Verified Shift
            </div>
          )}
        </div>
      </div>
    </>
  );
}
