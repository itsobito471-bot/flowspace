"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Loader2, AlertCircle, CheckCircle2, Settings as SettingsIcon, Calendar, Plus, Trash2, ShieldAlert } from "lucide-react";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const isAdmin = (session?.user as any)?.role?.level === "ADMIN";

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form State
  const [leaveTypes, setLeaveTypes] = useState<{ name: string, quota: number }[]>([]);
  const [weekendPolicy, setWeekendPolicy] = useState<number[]>([]);
  // specificRules format: "day-week" e.g., "6-2" means Saturday(6), Week 2.
  const [specificRules, setSpecificRules] = useState<string[]>([]);
  const [holidays, setHolidays] = useState<{ title: string; date: string; type: string }[]>([]);
  const [allowMultiCheckins, setAllowMultiCheckins] = useState(false);

  const [workStartTime, setWorkStartTime] = useState("09:00");
  const [workEndTime, setWorkEndTime] = useState("18:00");
  const [isOvertime, setIsOvertime] = useState(false);
  const [overtimeRate, setOvertimeRate] = useState(0);

  // Penalty / Black Point rules
  const [isBlackpointEnabled, setIsBlackpointEnabled] = useState(false); // org-level gate
  const [attendancePenaltyEnabled, setAttendancePenaltyEnabled] = useState(false);
  const [manualPenaltyEnabled, setManualPenaltyEnabled] = useState(false);
  const [lateGraceMins, setLateGraceMins] = useState(15);
  const [earlyCheckoutGraceMins, setEarlyCheckoutGraceMins] = useState(15);
  const [attendancePointsForLeave, setAttendancePointsForLeave] = useState(3);
  const [manualPointsForLeave, setManualPointsForLeave] = useState(3);

  useEffect(() => {
    if (status !== "authenticated" || !isAdmin) return;

    setLoading(true);
    fetch(`/api/settings?year=${selectedYear}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) throw new Error(j.message);
        setLeaveTypes(j.data.settings.leave_types || []);
        setWeekendPolicy(j.data.settings.weekend_policy);
        setAllowMultiCheckins(j.data.settings.allow_multi_checkins || false);

        setWorkStartTime(j.data.settings.work_start_time || "09:00");
        setWorkEndTime(j.data.settings.work_end_time || "18:00");
        setIsOvertime(j.data.settings.is_overtime_applicable || false);
        setOvertimeRate(j.data.settings.overtime_hourly_rate || 0);

        // Org-level feature flag
        setIsBlackpointEnabled(j.data.is_blackpoint_enabled ?? false);

        // Penalty rules
        const pr = j.data.settings.penalty_rules || {};
        setAttendancePenaltyEnabled(pr.attendance_penalty_enabled ?? false);
        setManualPenaltyEnabled(pr.manual_penalty_enabled ?? false);
        setLateGraceMins(pr.late_grace_period_mins ?? 15);
        setEarlyCheckoutGraceMins(pr.early_checkout_grace_period_mins ?? 15);
        setAttendancePointsForLeave(pr.attendance_points_for_leave_deduction ?? 3);
        setManualPointsForLeave(pr.manual_points_for_leave_deduction ?? 3);

        // Map specific rules into array of "day-week" strings
        const rules: string[] = [];
        for (const rule of j.data.settings.specific_weekend_rules || []) {
          for (const week of rule.weekNumbers) {
            rules.push(`${rule.dayOfWeek}-${week}`);
          }
        }
        setSpecificRules(rules);

        // Format holidays to YYYY-MM-DD
        const formattedHolidays = (j.data.holidays || []).map((h: any) => {
          // ensure we extract correctly using UTC
          const d = new Date(h.date);
          const y = d.getUTCFullYear();
          const m = String(d.getUTCMonth() + 1).padStart(2, "0");
          const day = String(d.getUTCDate()).padStart(2, "0");
          return {
            title: h.title,
            date: `${y}-${m}-${day}`,
            type: h.type || "PUBLIC",
          };
        });
        setHolidays(formattedHolidays);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedYear, status, isAdmin]);

  const toggleWeekend = (day: number) => {
    setWeekendPolicy((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleSpecificRule = (day: number, week: number) => {
    const key = `${day}-${week}`;
    setSpecificRules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const addHoliday = () => {
    setHolidays((prev) => [...prev, { title: "", date: "", type: "PUBLIC" }]);
  };

  const updateHoliday = (idx: number, field: "title" | "date" | "type", value: string) => {
    setHolidays((prev) => {
      const copy = [...prev];
      copy[idx][field] = value;
      return copy;
    });
  };

  const removeHoliday = (idx: number) => {
    setHolidays((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Validate Holidays
      for (const h of holidays) {
        if (!h.title.trim() || !h.date) {
          throw new Error("All holidays must have a title and a valid date.");
        }
        // Ensure the holiday year matches selectedYear (optional, but good UX)
        if (!h.date.startsWith(selectedYear.toString())) {
          throw new Error(`Holiday "${h.title}" date must be in the year ${selectedYear}.`);
        }
      }

      // 2. Reconstruct specific_weekend_rules
      const rulesMap = new Map<number, number[]>();
      for (const ruleStr of specificRules) {
        const [dayStr, weekStr] = ruleStr.split("-");
        const day = parseInt(dayStr);
        const week = parseInt(weekStr);
        if (!rulesMap.has(day)) rulesMap.set(day, []);
        rulesMap.get(day)!.push(week);
      }

      const specific_weekend_rules = Array.from(rulesMap.entries()).map(([day, weeks]) => ({
        dayOfWeek: day,
        weekNumbers: weeks,
      }));

      // 3. Post
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: selectedYear,
          leave_types: leaveTypes,
          weekend_policy: weekendPolicy,
          specific_weekend_rules,
          holidays,
          allow_multi_checkins: allowMultiCheckins,
          work_start_time: workStartTime,
          work_end_time: workEndTime,
          is_overtime_applicable: isOvertime,
          overtime_hourly_rate: overtimeRate,
          penalty_rules: {
            attendance_penalty_enabled: attendancePenaltyEnabled,
            manual_penalty_enabled: manualPenaltyEnabled,
            late_grace_period_mins: lateGraceMins,
            early_checkout_grace_period_mins: earlyCheckoutGraceMins,
            attendance_points_for_leave_deduction: attendancePointsForLeave,
            manual_points_for_leave_deduction: manualPointsForLeave,
          },
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={28} className="text-cyan animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertCircle size={36} className="text-red-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
          <p className="text-sm text-muted mt-1 max-w-xs">
            You need <span className="text-cyan font-semibold">ADMIN</span> privileges to view this page.
          </p>
        </div>
      </div>
    );
  }

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i); // CurrentYear - 1 up to + 4

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-muted/10 pb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center text-cyan">
            <SettingsIcon size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Company Settings</h1>
            <p className="text-xs sm:text-sm text-muted truncate">Configure global leave quotas and holiday policies.</p>
          </div>
        </div>

        {/* Year Selector — always on the right */}
        <div className="flex items-center gap-2 shrink-0">
          <Calendar size={16} className="text-muted hidden sm:block" />
          <span className="text-xs sm:text-sm font-semibold text-muted uppercase tracking-widest hidden sm:inline-block">Year:</span>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="bg-surface border border-muted/20 rounded-xl px-2 sm:px-3 py-1.5 text-foreground font-bold text-sm focus:outline-none focus:border-cyan appearance-none cursor-pointer"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl">
            <AlertCircle size={16} />
            <span className="text-sm font-medium">{error}</span>
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle2 size={16} />
            <span className="text-sm font-medium">Settings saved successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-cyan" size={32} /></div>
      ) : (
        <div className="bg-surface border border-muted/10 rounded-2xl p-4 sm:p-6 lg:p-8 space-y-8">

          {/* General Attendance Rules */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">General Attendance Rules</h2>
            <p className="text-sm text-muted mb-4">
              Configure baseline behavior for the attendance tracking system.
            </p>
            <div className="flex items-center justify-between bg-background p-4 rounded-xl border border-muted/10">
              <div>
                <p className="font-bold text-sm text-foreground">Allow Multiple Check-In/Check-Outs per Day</p>
                <p className="text-xs text-muted mt-1 max-w-sm">
                  If enabled, users can check in again after checking out. Useful for managing separate shifts.
                  If disabled, once checked out, the attendance log is closed for the day.
                </p>
              </div>
              <button
                onClick={() => setAllowMultiCheckins(prev => !prev)}
                className={`w-12 h-6 rounded-full relative transition-colors ${allowMultiCheckins ? "bg-cyan" : "bg-muted/30"}`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${allowMultiCheckins ? "left-7" : "left-1"}`}
                />
              </button>
            </div>


            {/* Standard Work Hours */}
            <div className="mt-6">
              <h3 className="text-sm font-bold text-foreground mb-2">Standard Work Hours</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted/80 block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={workStartTime}
                    onChange={(e) => setWorkStartTime(e.target.value)}
                    className="w-full bg-background border border-muted/20 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-cyan transition-all"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted/80 block mb-1">End Time</label>
                  <input
                    type="time"
                    value={workEndTime}
                    onChange={(e) => setWorkEndTime(e.target.value)}
                    className="w-full bg-background border border-muted/20 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-cyan transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Overtime Policy */}
            <div className="mt-6 bg-background p-4 rounded-xl border border-muted/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-foreground">Enable Overtime Pay</p>
                  <p className="text-xs text-muted mt-1">
                    If enabled, employees working past the End Time will log overtime hours for payroll.
                  </p>
                </div>
                <button
                  onClick={() => setIsOvertime(prev => !prev)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${isOvertime ? "bg-cyan" : "bg-muted/30"}`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${isOvertime ? "left-7" : "left-1"}`}
                  />
                </button>
              </div>

              {/* Only show the hourly rate input if overtime is enabled */}
              <AnimatePresence>
                {isOvertime && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="pt-2 border-t border-muted/10"
                  >
                    <label className="text-[10px] font-bold tracking-widest uppercase text-muted/80 block mb-1">Overtime Hourly Rate ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={overtimeRate}
                      onChange={(e) => setOvertimeRate(Number(e.target.value))}
                      className="w-32 bg-surface border border-muted/20 rounded-xl px-4 py-2.5 text-foreground font-bold focus:outline-none focus:border-cyan transition-all"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          <hr className="border-muted/10" />

          {/* ── Demerit (Black Point) Penalty Rules ── */}
          {isBlackpointEnabled && (
            <section>
            <div className="flex items-center gap-3 mb-2">
              <ShieldAlert size={18} className="text-amber-400" />
              <h2 className="text-lg font-bold text-foreground">Demerit Penalty Rules</h2>
            </div>
            <p className="text-sm text-muted mb-4">
              Configure independent rules for Automated Attendance Demerits and Externally Added (Manual) Demerits.
            </p>

            <div className="space-y-4">
              {/* Box 1: Automated Attendance */}
              <div className="bg-background rounded-xl border border-muted/10 p-4 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-foreground">Automated Attendance Demerits</p>
                    <p className="text-xs text-muted mt-0.5">Demerits issued automatically by the system for late arrivals and early departures.</p>
                  </div>
                  <button
                    onClick={() => setAttendancePenaltyEnabled(p => !p)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${attendancePenaltyEnabled ? "bg-amber-400" : "bg-muted/30"}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${attendancePenaltyEnabled ? "left-7" : "left-1"}`} />
                  </button>
                </div>

                <AnimatePresence>
                  {attendancePenaltyEnabled && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="pt-4 border-t border-muted/10 grid grid-cols-1 sm:grid-cols-3 gap-4 overflow-hidden"
                    >
                      <div>
                        <label className="text-[10px] font-bold tracking-widest uppercase text-muted/80 block mb-1">Late Grace (mins)</label>
                        <input
                          type="number" min="0" value={lateGraceMins}
                          onChange={e => setLateGraceMins(Number(e.target.value))}
                          className="w-full bg-surface border border-muted/20 rounded-xl px-4 py-2.5 text-foreground font-bold focus:outline-none focus:border-amber-400 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold tracking-widest uppercase text-muted/80 block mb-1">Early Checkout Grace (mins)</label>
                        <input
                          type="number" min="0" value={earlyCheckoutGraceMins}
                          onChange={e => setEarlyCheckoutGraceMins(Number(e.target.value))}
                          className="w-full bg-surface border border-muted/20 rounded-xl px-4 py-2.5 text-foreground font-bold focus:outline-none focus:border-amber-400 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold tracking-widest uppercase text-muted/80 block mb-1">Threshold (Leaves)</label>
                        <input
                          type="number" min="1" value={attendancePointsForLeave}
                          onChange={e => setAttendancePointsForLeave(Number(e.target.value))}
                          className="w-full bg-surface border border-muted/20 rounded-xl px-4 py-2.5 text-foreground font-bold focus:outline-none focus:border-amber-400 transition-all"
                        />
                        <p className="text-[9px] text-muted mt-1 leading-tight">Unresolved points needed for 1 deduction.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Box 2: Manual External */}
              <div className="bg-background rounded-xl border border-muted/10 p-4 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-foreground">Externally Added (Manual) Demerits</p>
                    <p className="text-xs text-muted mt-0.5">Demerits added manually by admins through the API/Dashboard.</p>
                  </div>
                  <button
                    onClick={() => setManualPenaltyEnabled(p => !p)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${manualPenaltyEnabled ? "bg-amber-400" : "bg-muted/30"}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${manualPenaltyEnabled ? "left-7" : "left-1"}`} />
                  </button>
                </div>

                <AnimatePresence>
                  {manualPenaltyEnabled && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="pt-4 border-t border-muted/10 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-hidden"
                    >
                      <div>
                        <label className="text-[10px] font-bold tracking-widest uppercase text-muted/80 block mb-1">Threshold (Leaves)</label>
                        <input
                          type="number" min="1" value={manualPointsForLeave}
                          onChange={e => setManualPointsForLeave(Number(e.target.value))}
                          className="w-full bg-surface border border-muted/20 rounded-xl px-4 py-2.5 text-foreground font-bold focus:outline-none focus:border-amber-400 transition-all"
                        />
                        <p className="text-[9px] text-muted mt-1 leading-tight">Unresolved manual points needed to instantly trigger 1 deduction.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>
          )}

          <hr className="border-muted/10" />

          {/* Categorized Leave Types */}
          <section>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground mb-2">Leave Categories ({selectedYear})</h2>
                <p className="text-sm text-muted">Define the types of leaves available and their yearly quotas.</p>
              </div>
              <button
                onClick={() => setLeaveTypes(prev => [...prev, { name: "", quota: 0 }])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-muted/20 text-xs font-bold text-foreground hover:bg-muted/10 transition-colors self-start sm:self-auto shrink-0"
              >
                <Plus size={14} /> Add Category
              </button>
            </div>

            <div className="bg-background rounded-xl border border-muted/10 overflow-hidden">
              {leaveTypes.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted">No leave categories defined.</div>
              ) : (
                <div className="divide-y divide-muted/10">
                  {leaveTypes.map((lt, idx) => (
                    <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-muted/5 transition-colors">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold tracking-widest uppercase text-muted/80 block mb-1">Category Name</label>
                        <input
                          type="text"
                          value={lt.name}
                          onChange={e => {
                            const copy = [...leaveTypes];
                            copy[idx].name = e.target.value;
                            setLeaveTypes(copy);
                          }}
                          placeholder="e.g. Sick Leave"
                          className="w-full bg-transparent border-b border-muted/20 px-0 py-1.5 text-sm text-foreground focus:outline-none focus:border-cyan transition-all"
                        />
                      </div>
                      <div className="w-full sm:w-32">
                        <label className="text-[10px] font-bold tracking-widest uppercase text-muted/80 block mb-1">Days / Year</label>
                        <input
                          type="number"
                          min="0"
                          value={lt.quota}
                          onChange={e => {
                            const copy = [...leaveTypes];
                            copy[idx].quota = Number(e.target.value);
                            setLeaveTypes(copy);
                          }}
                          className="w-full bg-transparent border-b border-muted/20 px-0 py-1.5 text-sm text-foreground focus:outline-none focus:border-cyan transition-all"
                        />
                      </div>
                      <div className="sm:pt-5 pt-0 flex justify-end">
                        <button
                          onClick={() => setLeaveTypes(prev => prev.filter((_, i) => i !== idx))}
                          className="p-2 rounded-xl text-red-500/70 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                          title="Remove Category"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <hr className="border-muted/10" />

          {/* Global Weekends */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">Standard Weekly Offs</h2>
            <p className="text-sm text-muted mb-4">
              Select the days that are considered regular weekly holidays for all employees.
              Checking in on these days grants an automatic <b>Flex Leave (Comp Off)</b>.
            </p>
            <div className="flex flex-wrap gap-3">
              {daysOfWeek.map((day, idx) => {
                const checked = weekendPolicy.includes(idx);
                return (
                  <button
                    key={day}
                    onClick={() => toggleWeekend(idx)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border
                      ${checked
                        ? "bg-cyan text-white border-cyan shadow-md shadow-cyan/25"
                        : "bg-surface border-muted/20 text-muted hover:border-muted/40 hover:text-foreground"
                      }
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </section>

          <hr className="border-muted/10" />

          {/* Specific / Alternating Weekends */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">Alternating Offs (e.g., 2nd & 4th Saturday)</h2>
            <p className="text-sm text-muted mb-6">
              If some days are only holidays on specific weeks of the month, select them below.
            </p>
            <div className="space-y-4">
              {daysOfWeek.map((day, idx) => {
                // Only let them select alternating options if it's NOT a standard global off.
                if (weekendPolicy.includes(idx)) return null;

                return (
                  <div key={`alt-${day}`} className="flex flex-col xs:flex-row xs:items-center gap-2">
                    <div className="w-full xs:w-24 text-sm font-semibold text-foreground">{day}</div>
                    <div className="flex gap-2 flex-wrap">
                      {[1, 2, 3, 4, 5].map((weekNum) => {
                        const key = `${idx}-${weekNum}`;
                        const checked = specificRules.includes(key);
                        return (
                          <button
                            key={key}
                            onClick={() => toggleSpecificRule(idx, weekNum)}
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all border
                              ${checked
                                ? "bg-violet text-white border-violet shadow-md shadow-violet/25"
                                : "bg-surface border-muted/20 text-muted hover:border-muted/40 hover:text-foreground"}
                            `}
                            title={`Week ${weekNum}`}
                          >
                            W{weekNum}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <hr className="border-muted/10" />

          {/* Public Holidays Array */}
          <section>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground mb-2">Public Holidays ({selectedYear})</h2>
                <p className="text-sm text-muted">
                  Add specific, one-off dates where the office is closed.
                </p>
              </div>
              <button
                onClick={addHoliday}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-muted/20 text-xs font-bold text-foreground hover:bg-muted/10 transition-colors self-start sm:self-auto shrink-0"
              >
                <Plus size={14} /> Add Holiday
              </button>
            </div>

            <div className="bg-background rounded-xl border border-muted/10 overflow-hidden">
              {holidays.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted">No public holidays defined for {selectedYear} yet.</div>
              ) : (
                <div className="divide-y divide-muted/10">
                  {holidays.map((h, idx) => (
                    <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-muted/5 transition-colors">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold tracking-widest uppercase text-muted/80 block mb-1">Holiday Title</label>
                        <input
                          type="text"
                          value={h.title}
                          onChange={e => updateHoliday(idx, "title", e.target.value)}
                          placeholder="e.g. Independence Day"
                          className="w-full bg-transparent border-b border-muted/20 px-0 py-1.5 text-sm text-foreground focus:outline-none focus:border-cyan transition-all"
                        />
                      </div>
                      <div className="w-full sm:w-48">
                        <label className="text-[10px] font-bold tracking-widest uppercase text-muted/80 block mb-1">Date</label>
                        <input
                          type="date"
                          value={h.date}
                          onChange={e => updateHoliday(idx, "date", e.target.value)}
                          className="w-full bg-transparent border-b border-muted/20 px-0 py-1.5 text-sm text-foreground focus:outline-none focus:border-cyan transition-all uppercase"
                        />
                      </div>
                      <div className="w-full sm:w-36">
                        <label className="text-[10px] font-bold tracking-widest uppercase text-muted/80 block mb-1">Status</label>
                        <select
                          value={h.type}
                          onChange={e => updateHoliday(idx, "type", e.target.value)}
                          className="w-full bg-transparent border-b border-muted/20 px-0 py-1.5 text-sm text-foreground focus:outline-none focus:border-cyan transition-all appearance-none cursor-pointer"
                        >
                          <option value="PUBLIC" className="bg-surface">Confirmed Public</option>
                          <option value="PROVISIONAL" className="bg-surface">Provisional (TBC)</option>
                          <option value="OPTIONAL" className="bg-surface">Optional Restricted</option>
                        </select>
                      </div>
                      <div className="sm:pt-5 pt-0 flex justify-end">
                        <button
                          onClick={() => removeHoliday(idx)}
                          className="p-2 rounded-xl text-red-500/70 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                          title="Remove Holiday"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Save Button */}
          <div className="pt-6 border-t border-muted/10">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background text-sm font-bold tracking-tight hover:bg-foreground/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Saving Changes..." : `Save Settings for ${selectedYear}`}
            </button>
          </div>

        </div>
      )}
    </motion.div>
  );
}
