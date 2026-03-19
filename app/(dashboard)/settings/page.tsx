"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Loader2, AlertCircle, CheckCircle2, Settings as SettingsIcon, Calendar, Plus, Trash2 } from "lucide-react";

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

  useEffect(() => {
    if (status !== "authenticated" || !isAdmin) return;

    setLoading(true);
    fetch(`/api/settings?year=${selectedYear}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) throw new Error(j.message);
        setLeaveTypes(j.data.settings.leave_types || []);
        setWeekendPolicy(j.data.settings.weekend_policy);

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-muted/10 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center text-cyan">
            <SettingsIcon size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Company Settings</h1>
            <p className="text-sm text-muted">Configure global leave quotas and holiday policies.</p>
          </div>
        </div>

        {/* Year Selector */}
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-muted" />
          <span className="text-sm font-semibold text-muted uppercase tracking-widest hidden sm:inline-block">Config Year:</span>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="bg-surface border border-muted/20 rounded-xl px-3 py-1.5 text-foreground font-bold focus:outline-none focus:border-cyan appearance-none cursor-pointer"
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
        <div className="bg-surface border border-muted/10 rounded-2xl p-6 lg:p-8 space-y-8">

          {/* Leave Quota */}
          {/* Categorized Leave Types */}
          <section>
            <div className="flex justify-between items-end mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground mb-2">Leave Categories ({selectedYear})</h2>
                <p className="text-sm text-muted">Define the types of leaves available and their yearly quotas.</p>
              </div>
              <button
                onClick={() => setLeaveTypes(prev => [...prev, { name: "", quota: 0 }])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-muted/20 text-xs font-bold text-foreground hover:bg-muted/10 transition-colors"
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
                  <div key={`alt-${day}`} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-semibold text-foreground">{day}</div>
                    <div className="flex gap-2">
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
            <div className="flex justify-between items-end mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground mb-2">Public Holidays ({selectedYear})</h2>
                <p className="text-sm text-muted">
                  Add specific, one-off dates where the office is closed.
                </p>
              </div>
              <button
                onClick={addHoliday}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-muted/20 text-xs font-bold text-foreground hover:bg-muted/10 transition-colors"
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
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan to-violet text-white text-sm font-bold tracking-tight shadow-[0_4px_24px_rgba(0,242,254,0.25)] hover:shadow-[0_6px_32px_rgba(0,242,254,0.40)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
