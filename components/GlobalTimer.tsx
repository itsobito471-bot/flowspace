"use client";

import { useEffect, useState, useRef } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Play,
  Pause,
  Tag,
  AlignLeft,
  Coins,
  ChevronDown,
  X,
  Save,
  CheckCircle2,
  Loader2,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Helper to parse time string (e.g. "3h 20m", "45m", "2h") into seconds
const parseTimeStringToSeconds = (str: string): number => {
  const matchHours = str.match(/(\d+)\s*h/i);
  const matchMins = str.match(/(\d+)\s*m/i);
  const matchSecs = str.match(/(\d+)\s*s/i);

  let total = 0;
  if (matchHours) total += parseInt(matchHours[1], 10) * 3600;
  if (matchMins) total += parseInt(matchMins[1], 10) * 60;
  if (matchSecs) total += parseInt(matchSecs[1], 10);

  // Fallback: if they just typed a number, assume it represents minutes
  if (total === 0 && /^\d+$/.test(str.trim())) {
    total = parseInt(str.trim(), 10) * 60;
  }
  return total;
};

// Helper to format seconds to HH:MM:SS
const formatTime = (totalSeconds: number): string => {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (num: number) => String(num).padStart(2, "0");
  return `${hrs}:${pad(mins)}:${pad(secs)}`;
};

export default function GlobalTimer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Form states
  const [timeInput, setTimeInput] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isOvertime, setIsOvertime] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Custom task dropdown states
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false);
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [taskPage, setTaskPage] = useState(1);
  const [hasMoreTasks, setHasMoreTasks] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Fetch historical time logs to compute today's total
  const { data: logsData, mutate: mutateLogs } = useSWR("/api/time-logs", fetcher);
  const logs = logsData?.data || [];

  // Compute total seconds tracked today
  const todayTotalSeconds = logs
    .filter((log: any) => {
      const d = new Date(log.start_time);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    })
    .reduce((sum: number, log: any) => sum + log.duration_seconds, 0);

  // Fetch assigned tasks paginated helper
  const fetchAssignedTasks = async (pageToFetch: number, reset = false) => {
    setLoadingTasks(true);
    try {
      const res = await fetch(`/api/tasks/my-assigned?page=${pageToFetch}&limit=10`);
      const json = await res.json();
      if (json.success) {
        setAssignedTasks((prev) => (reset ? json.tasks : [...prev, ...json.tasks]));
        setHasMoreTasks(json.hasMore);
      }
    } catch (err) {
      console.error("Error fetching assigned tasks:", err);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Trigger tasks fetch on popover open
  useEffect(() => {
    if (isOpen) {
      setTaskPage(1);
      fetchAssignedTasks(1, true);
    } else {
      setIsTaskDropdownOpen(false);
    }
  }, [isOpen]);

  const handleLoadMoreTasks = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextPage = taskPage + 1;
    setTaskPage(nextPage);
    fetchAssignedTasks(nextPage);
  };

  // Persist timer start time in LocalStorage across reloads
  useEffect(() => {
    const savedStart = localStorage.getItem("flowspace-timer-start");
    if (savedStart) {
      const parsedDate = new Date(savedStart);
      setStartTime(parsedDate);
      setIsRunning(true);
      const currentDiff = Math.floor((new Date().getTime() - parsedDate.getTime()) / 1000);
      setSeconds(currentDiff > 0 ? currentDiff : 0);
    }
  }, []);

  // Update clock every second if running
  useEffect(() => {
    let interval: any = null;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        const diff = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
        setSeconds(diff > 0 ? diff : 0);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  // Click outside listener to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStartStop = () => {
    if (isRunning) {
      // Stop the timer
      setIsRunning(false);
      localStorage.removeItem("flowspace-timer-start");
      // Populate time input with the final timer duration in simple text format
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      let durationStr = "";
      if (hrs > 0) durationStr += `${hrs}h `;
      if (mins > 0) durationStr += `${mins}m`;
      if (durationStr === "") durationStr = `${seconds}s`;
      setTimeInput(durationStr.trim());
    } else {
      // Start the timer
      const now = new Date();
      setStartTime(now);
      setSeconds(0);
      setIsRunning(true);
      setTimeInput("");
      localStorage.setItem("flowspace-timer-start", now.toISOString());
      if (isOvertime) {
        fetch("/api/time-logs/notify-started", { method: "POST" }).catch(err => console.error(err));
      }
    }
  };

  const handleSave = async () => {
    setFeedback(null);
    let finalDuration = 0;
    let finalStart = startTime || new Date();
    let finalEnd = new Date();

    if (timeInput.trim()) {
      // Manual mode
      finalDuration = parseTimeStringToSeconds(timeInput);
      if (finalDuration <= 0) {
        setFeedback("Please enter a valid time string (e.g. 2h 30m)");
        return;
      }
      // Calculate start time based on end time and duration
      finalStart = new Date(finalEnd.getTime() - finalDuration * 1000);
    } else if (isRunning && seconds > 0) {
      // Running timer mode - stop and save
      finalDuration = seconds;
      setIsRunning(false);
      localStorage.removeItem("flowspace-timer-start");
    } else {
      setFeedback("Please start the timer or enter a duration.");
      return;
    }

    setIsSubmitting(true);

    try {
      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch("/api/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: selectedTaskId || undefined,
          duration_seconds: finalDuration,
          start_time: finalStart.toISOString(),
          end_time: finalEnd.toISOString(),
          notes,
          tags: parsedTags,
          is_billable_overtime: isOvertime,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setFeedback("Time logged successfully!");
      // Reset form states
      setTimeInput("");
      setNotes("");
      setTagsInput("");
      setIsOvertime(false);
      setSelectedTaskId("");
      setSeconds(0);
      setStartTime(null);
      mutateLogs();

      setTimeout(() => {
        setFeedback(null);
        setIsOpen(false);
      }, 1500);
    } catch (err: any) {
      setFeedback(err.message || "Failed to save time log.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatHoursToday = (sec: number) => {
    return (sec / 3600).toFixed(1) + "h";
  };

  const selectedTask = assignedTasks.find((t) => t._id === selectedTaskId);

  return (
    <div className="relative" ref={popoverRef}>
      {/* ── Top Bar Trigger ── */}
      <div className="flex items-center gap-2 bg-muted/5 border border-muted/10 rounded-xl px-3 py-1.5 hover:border-cyan/20 transition-all select-none">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-muted hover:text-foreground transition-colors outline-none"
          title="Track Time"
        >
          <Clock size={16} className={isRunning ? "text-cyan animate-pulse" : ""} />
          <span className={`text-xs font-mono tabular-nums tracking-wider ${isRunning ? "text-foreground font-semibold animate-pulse" : "text-muted"}`}>
            {formatTime(isRunning ? seconds : 0)}
          </span>
        </button>

        <button
          onClick={handleStartStop}
          className={`p-0.5 rounded-md hover:bg-muted/10 transition-colors ${
            isRunning ? "text-amber-500" : "text-cyan"
          }`}
          title={isRunning ? "Stop Timer" : "Start Timer"}
        >
          {isRunning ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
      </div>

      {/* ── Popover Dropdown (Fully Theme-Aware) ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-surface border border-slate-200/80 dark:border-muted/15 shadow-2xl p-4 z-50 text-slate-800 dark:text-foreground"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-muted/10">
              <span className="text-xs font-bold tracking-wider uppercase text-slate-400 dark:text-muted">
                Track Time
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-cyan bg-cyan/10 px-2 py-0.5 rounded-full font-bold">
                  {formatHoursToday(todayTotalSeconds)} / 8.0h today
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:text-muted dark:hover:text-foreground transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Notification / Feedback Banner */}
            {feedback && (
              <div className={`mt-3 p-2 rounded-xl text-xs flex items-center gap-1.5 ${
                feedback.includes("success") 
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                  : "bg-red-500/10 text-red-600 border border-red-500/20"
              }`}>
                <CheckCircle2 size={12} />
                <span>{feedback}</span>
              </div>
            )}

            {/* Main Input Box */}
            <div className="mt-4">
              <div className="relative flex items-center rounded-xl bg-slate-50 dark:bg-background border border-slate-200/80 dark:border-muted/15 focus-within:border-cyan transition-colors p-1">
                <input
                  type="text"
                  value={timeInput}
                  onChange={(e) => setTimeInput(e.target.value)}
                  disabled={isRunning}
                  placeholder={isRunning ? "Timer is running..." : "Enter time (ex: 2h 15m) or play"}
                  className="bg-transparent text-xs text-slate-800 dark:text-foreground placeholder:text-slate-400 dark:placeholder:text-muted/40 focus:outline-none w-full px-3 py-1.5 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleStartStop}
                  className={`p-2 rounded-lg transition-colors shrink-0 cursor-pointer ${
                    isRunning
                      ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                      : "bg-cyan/10 text-cyan hover:bg-cyan/20"
                  }`}
                >
                  {isRunning ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                </button>
              </div>
            </div>

            {/* Task Selector */}
            <div className="mt-3">
              <label className="text-[9px] font-bold text-slate-400 dark:text-muted uppercase tracking-widest block mb-1">
                Linked Task (Assigned to you)
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsTaskDropdownOpen(!isTaskDropdownOpen)}
                  className="w-full bg-slate-50 dark:bg-background border border-slate-200/80 dark:border-muted/15 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-foreground hover:bg-slate-100 dark:hover:bg-muted/5 transition-colors focus:outline-none focus:border-cyan flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate">
                    {selectedTaskId && selectedTask ? selectedTask.title : "Select a task..."}
                  </span>
                  <ChevronDown size={12} className="text-slate-400 dark:text-muted transition-transform shrink-0 ml-2" />
                </button>

                <AnimatePresence>
                  {isTaskDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl bg-white dark:bg-surface border border-slate-200/80 dark:border-muted/15 shadow-2xl z-50 py-1"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTaskId("");
                          setIsTaskDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-400 dark:text-muted hover:bg-slate-50 dark:hover:bg-muted/10 transition-colors cursor-pointer"
                      >
                        Select a task... (Clear)
                      </button>

                      {assignedTasks.map((task: any) => (
                        <button
                          key={task._id}
                          type="button"
                          onClick={() => {
                            setSelectedTaskId(task._id);
                            setIsTaskDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs truncate transition-colors flex items-center justify-between cursor-pointer ${
                            selectedTaskId === task._id
                              ? "bg-cyan/10 text-cyan"
                              : "text-slate-800 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted/10"
                          }`}
                        >
                          <span className="truncate font-medium">{task.title}</span>
                          {task.status && (
                            <span className="text-[9px] bg-slate-200/50 dark:bg-muted/10 text-slate-600 dark:text-muted px-1.5 py-0.5 rounded uppercase font-bold scale-90 shrink-0">
                              {task.status}
                            </span>
                          )}
                        </button>
                      ))}

                      {loadingTasks && (
                        <div className="flex justify-center items-center py-2">
                          <Loader2 className="animate-spin text-cyan" size={12} />
                        </div>
                      )}

                      {!loadingTasks && hasMoreTasks && (
                        <button
                          type="button"
                          onClick={handleLoadMoreTasks}
                          className="w-full text-center py-1.5 text-[10px] font-bold text-cyan hover:bg-cyan/10 transition-all border-t border-slate-100 dark:border-muted/10 cursor-pointer"
                        >
                          Load More Tasks
                        </button>
                      )}

                      {!loadingTasks && assignedTasks.length === 0 && (
                        <div className="px-3 py-4 text-center text-xs text-slate-400 dark:text-muted">
                          No tasks assigned to you.
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Date/Time Display Row */}
            <div className="mt-3 bg-slate-50 dark:bg-muted/5 border border-slate-200/60 dark:border-muted/10 rounded-xl p-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-muted font-mono">
              <span>Date: {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              <span>
                {startTime ? startTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : "Ready"} 
                {startTime && " - Active"}
              </span>
            </div>

            {/* Notes Input */}
            <div className="mt-3">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-background border border-slate-200/80 dark:border-muted/15 focus-within:border-cyan rounded-xl px-3 py-1.5 transition-colors">
                <AlignLeft size={12} className="text-slate-400 dark:text-muted shrink-0" />
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes..."
                  className="bg-transparent text-xs text-slate-800 dark:text-foreground placeholder:text-slate-400 dark:placeholder:text-muted/40 focus:outline-none w-full"
                />
              </div>
            </div>

            {/* Tags Input */}
            <div className="mt-3">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-background border border-slate-200/80 dark:border-muted/15 focus-within:border-cyan rounded-xl px-3 py-1.5 transition-colors">
                <Tag size={12} className="text-slate-400 dark:text-muted shrink-0" />
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Tags (comma-separated)..."
                  className="bg-transparent text-xs text-slate-800 dark:text-foreground placeholder:text-slate-400 dark:placeholder:text-muted/40 focus:outline-none w-full"
                />
              </div>
            </div>

            {/* Footer Row */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-muted/10 flex items-center justify-between">
              {/* Overtime Toggle */}
              <button
                onClick={() => {
                  const newOvertime = !isOvertime;
                  setIsOvertime(newOvertime);
                  if (newOvertime && isRunning) {
                    fetch("/api/time-logs/notify-started", { method: "POST" }).catch(err => console.error(err));
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  isOvertime
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                    : "bg-slate-50 dark:bg-background border border-slate-200/80 dark:border-muted/15 text-slate-500 dark:text-muted hover:border-slate-300 dark:hover:border-muted/30"
                }`}
              >
                <Coins size={12} />
                <span>Overtime Approval</span>
              </button>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex items-center gap-1 bg-cyan text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-bold px-4 py-2 rounded-xl text-xs transition-colors shrink-0 cursor-pointer"
              >
                <Save size={12} />
                <span>Save</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
