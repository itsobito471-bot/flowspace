"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  startOfWeek, endOfWeek, eachDayOfInterval, format, addWeeks, subWeeks,
  isSameDay, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth
} from "date-fns";

// Types
interface AttendanceData {
  _id: string;
  user_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  description?: string;
  added_by?: string;
}

interface LeaveData {
  _id: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  status: string;
}

interface HolidaySummary {
  total: number;
  passed: number;
  remaining: number;
  upcoming: { title: string; date: string; type: string }[];
}

interface CalendarViewProps {
  employeeId: string;
}

export default function CalendarView({ employeeId }: CalendarViewProps) {
  // State: Data
  const [attendance, setAttendance] = useState<AttendanceData[]>([]);
  const [leaves, setLeaves] = useState<LeaveData[]>([]);
  const [holidaySummary, setHolidaySummary] = useState<HolidaySummary | null>(null);
  const [loading, setLoading] = useState(false);

  // State: Dates
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [miniCalMonth, setMiniCalMonth] = useState(new Date());
  const [selectedRecord, setSelectedRecord] = useState<AttendanceData | null>(null);

  // Derived Grid Dates
  const weekStart = useMemo(() => startOfWeek(currentWeek, { weekStartsOn: 0 }), [currentWeek]);
  const weekEnd = useMemo(() => endOfWeek(currentWeek, { weekStartsOn: 0 }), [currentWeek]);
  const daysInWeek = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);
  
  // Grid config (06:00 to 22:00 = 16 hours)
  const START_HOUR = 6;
  const END_HOUR = 22;
  const TOTAL_HOURS = END_HOUR - START_HOUR;
  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

  // Fetch Calendar Data
  const fetchCalendar = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const startStr = format(weekStart, "yyyy-MM-dd");
      const endStr = format(weekEnd, "yyyy-MM-dd");
      const url = `/api/attendance?startDate=${startStr}&endDate=${endStr}&userId=${employeeId}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setAttendance(json.data.attendance || []);
        setLeaves(json.data.leaves || []);
        if (json.data.holidaySummary) setHolidaySummary(json.data.holidaySummary);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [employeeId, weekStart, weekEnd]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  // Helpers
  const formatTime = (isoString: string) => format(new Date(isoString), "HH:mm");

  const getEventPositionStyles = (checkIn: string, checkOut: string | null) => {
    const inDate = new Date(checkIn);
    const outDate = checkOut ? new Date(checkOut) : new Date(); // If ongoing, stretches to now
    
    let inMins = inDate.getHours() * 60 + inDate.getMinutes();
    let outMins = outDate.getHours() * 60 + outDate.getMinutes();

    // Map bounds to visible grid
    const startMinsVisible = START_HOUR * 60;
    const endMinsVisible = END_HOUR * 60;

    if (inMins < startMinsVisible) inMins = startMinsVisible;
    if (outMins > endMinsVisible) outMins = endMinsVisible;
    if (inMins > outMins) return { display: "none" }; // Out of bounds

    const totalGridMins = TOTAL_HOURS * 60;
    const topPercentage = ((inMins - startMinsVisible) / totalGridMins) * 100;
    const heightPercentage = ((outMins - inMins) / totalGridMins) * 100;

    return {
      top: `${topPercentage}%`,
      height: `${heightPercentage}%`,
      minHeight: "4%" // ensure it's visible even if short
    };
  };

  const isDayOnLeave = (date: Date) => {
    const dStr = format(date, "yyyy-MM-dd");
    return leaves.find(l => {
      const s = format(new Date(l.start_date), "yyyy-MM-dd");
      const e = format(new Date(l.end_date), "yyyy-MM-dd");
      return dStr >= s && dStr <= e;
    });
  };

  // Mini Calendar logic
  const monthStart = startOfMonth(miniCalMonth);
  const monthEnd = endOfMonth(miniCalMonth);
  const miniCalStartDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const miniCalEndDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const miniCalDays = eachDayOfInterval({ start: miniCalStartDate, end: miniCalEndDate });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full min-h-[600px] w-full">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0 pt-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight">Calendar</h2>
          {loading && <Loader2 className="animate-spin text-cyan ml-2" size={16} />}
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="p-2 border border-muted/20 hover:border-cyan hover:text-cyan rounded-xl transition-all">
            <ChevronLeft size={16} />
          </button>
          <div className="px-4 py-2 bg-surface border border-muted/20 rounded-xl font-bold text-sm min-w-[140px] text-center">
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </div>
          <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="p-2 border border-muted/20 hover:border-cyan hover:text-cyan rounded-xl transition-all">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setCurrentWeek(new Date())} className="ml-2 px-4 py-2 bg-white text-black font-bold text-xs rounded-xl hover:bg-white/90 transition-all">
            Today
          </button>
        </div>
      </div>

      {/* Main Layout Area */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 pb-4">
        
        {/* Calendar Grid Container */}
        <div className="flex-1 bg-surface border border-muted/20 rounded-2xl flex flex-col min-h-[500px] shadow-sm overflow-hidden">
          {/* Days Header */}
          <div className="flex border-b border-muted/10 shrink-0 bg-background/50">
            <div className="w-16 border-r border-muted/10 shrink-0" /> {/* Time axis gap */}
            {daysInWeek.map(day => {
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className="flex-1 py-3 text-center border-r border-muted/10 last:border-r-0">
                  <div className={`text-[10px] font-bold tracking-widest uppercase ${isToday ? "text-cyan" : "text-muted"}`}>
                    {format(day, "EEE")}
                  </div>
                  <div className={`text-xl font-black mt-1 ${isToday ? "text-cyan" : "text-foreground"}`}>
                    {format(day, "d")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid Scroll Area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex">
            {/* Time Axis */}
            <div className="w-16 shrink-0 border-r border-muted/10 relative bg-surface z-10">
              {hours.map((hour, idx) => (
                <div key={hour} className="absolute w-full flex justify-center text-[10px] font-bold text-muted -translate-y-1/2" style={{ top: `${(idx / TOTAL_HOURS) * 100}%` }}>
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Grid Days */}
            <div className="flex-1 flex relative">
              {/* Horizontal grid lines */}
              {hours.map((hour, idx) => (
                <div key={`hl-${hour}`} className="absolute w-full border-t border-muted/10 pointer-events-none" style={{ top: `${(idx / TOTAL_HOURS) * 100}%` }} />
              ))}

              {/* Day Columns */}
              {daysInWeek.map(day => {
                const dayStr = format(day, "yyyy-MM-dd");
                const dayRecords = attendance.filter(a => format(new Date(a.date), "yyyy-MM-dd") === dayStr);
                const leaveRecord = isDayOnLeave(day);

                return (
                  <div key={day.toISOString()} className="flex-1 border-r border-muted/10 last:border-r-0 relative group">
                    {/* Hover vertical highlight */}
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    {/* Leave Underlay */}
                    {leaveRecord && (
                      <div className="absolute inset-x-1 top-4 bottom-4 bg-violet-500/10 border border-violet-500/20 rounded-lg flex flex-col items-center justify-start pt-6 text-center shadow-sm z-0 pointer-events-none">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-violet-400 mb-1">On Leave</span>
                        <span className="text-[10px] font-semibold text-foreground/80 truncate max-w-[90%]">{leaveRecord.leave_type}</span>
                      </div>
                    )}

                    {/* Attendance Blocks Overlay */}
                    {dayRecords.map((record, i) => {
                      if (!record.check_in) return null;
                      const styles = getEventPositionStyles(record.check_in, record.check_out);
                      if (styles.display === "none") return null;
                      
                      const isManual = !!record.added_by;
                      const borderColor = isManual ? "border-amber-500" : "border-cyan";
                      const bgHover = isManual ? "bg-amber-500/10 group-hover:bg-amber-500/15" : "bg-cyan/10 group-hover:bg-cyan/15";
                      const textColor = isManual ? "text-amber-500/90" : "text-cyan/90";

                      return (
                        <div
                          key={record._id + i}
                          onClick={() => setSelectedRecord(record)}
                          className={`absolute border-l-2 ${borderColor} rounded-r-lg p-2 overflow-hidden shadow-sm transition-all hover:shadow-md cursor-pointer group/event bg-surface`}
                          style={{
                            ...styles,
                            left: `${4 + (i % 5) * 6}px`, // Cascade slightly to the right
                            right: '4px',
                            zIndex: 20 + i,
                          }}
                          title={isManual ? `Added by Admin: ${record.description || 'Manual entry'}` : "Regular Attendance"}
                        >
                          <div className={`absolute inset-0 ${bgHover} transition-colors pointer-events-none`} />
                          <div className={`text-[10px] font-bold ${textColor} leading-none mb-1 shadow-sm relative z-10 truncate`}>
                            {formatTime(record.check_in)} - {record.check_out ? formatTime(record.check_out) : "Now"}
                          </div>
                          <div className="text-[10px] text-muted hidden md:flex flex-col relative z-10">
                            <span className="truncate">Dur: {record.check_out ? (
                              (new Date(record.check_out).getTime() - new Date(record.check_in).getTime()) / 3600000
                            ).toFixed(1) : "..."}h</span>
                            {isManual && record.description && (
                              <span className="truncate text-amber-500/70 mt-0.5">{record.description}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Mini Calendar Map */}
        <div className="w-full lg:w-72 shrink-0 bg-surface border border-muted/20 rounded-2xl p-5 flex flex-col h-fit">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setMiniCalMonth(subMonths(miniCalMonth, 1))} className="text-muted hover:text-cyan"><ChevronLeft size={16}/></button>
            <h3 className="text-sm font-bold">{format(miniCalMonth, "MMMM yyyy")}</h3>
            <button onClick={() => setMiniCalMonth(addMonths(miniCalMonth, 1))} className="text-muted hover:text-cyan"><ChevronRight size={16}/></button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[10px] font-bold text-muted uppercase">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          
          <div className="grid grid-cols-7 gap-1 flex-1">
            {miniCalDays.map((day, i) => {
              const isSelectedWeek = day >= weekStart && day <= weekEnd;
              const isCurrMonth = isSameMonth(day, miniCalMonth);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentWeek(day);
                    if (!isCurrMonth) setMiniCalMonth(day);
                  }}
                  className={`
                    aspect-square rounded-full flex items-center justify-center text-xs font-semibold text-center transition-all
                    ${isToday && !isSelectedWeek ? "border border-cyan text-cyan" : ""}
                    ${isSelectedWeek ? "bg-cyan text-white shadow-md shadow-cyan/20 scale-110 z-10" : "hover:bg-muted/10"}
                    ${!isCurrMonth && !isSelectedWeek ? "text-muted/30" : (isSelectedWeek ? "" : "text-foreground")}
                  `}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-muted/10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded bg-cyan/20 border border-cyan/40" />
              <span className="text-xs font-medium text-muted">Attendance Block</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40" />
              <span className="text-xs font-medium text-muted">Manual Time</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded bg-violet-500/20 border border-violet-500/40" />
              <span className="text-xs font-medium text-muted">Leave / Holiday</span>
            </div>
          </div>

          {/* Holiday Summary Widget */}
          {holidaySummary && (
            <div className="mt-6 pt-6 border-t border-muted/10">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted mb-3">Public Holidays {new Date().getFullYear()}</h4>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-muted/5 border border-muted/10 rounded-xl p-2 text-center">
                  <div className="text-lg font-black text-foreground">{holidaySummary.total}</div>
                  <div className="text-[9px] uppercase tracking-wider text-muted font-bold">Total</div>
                </div>
                <div className="bg-muted/5 border border-muted/10 rounded-xl p-2 text-center">
                  <div className="text-lg font-black text-violet-400">{holidaySummary.passed}</div>
                  <div className="text-[9px] uppercase tracking-wider text-muted font-bold">Taken</div>
                </div>
                <div className="bg-muted/5 border border-muted/10 rounded-xl p-2 text-center">
                  <div className="text-lg font-black text-cyan">{holidaySummary.remaining}</div>
                  <div className="text-[9px] uppercase tracking-wider text-muted font-bold">Left</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-muted/10 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-cyan rounded-full transition-all"
                  style={{ width: holidaySummary.total > 0 ? `${(holidaySummary.passed / holidaySummary.total) * 100}%` : "0%" }}
                />
              </div>

              {/* Upcoming Holidays */}
              {holidaySummary.upcoming.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Upcoming</p>
                  {holidaySummary.upcoming.map((h, i) => (
                    <div key={i} className="flex items-center gap-2.5 py-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{h.title}</p>
                        <p className="text-[10px] text-muted">
                          {format(new Date(h.date), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {holidaySummary.upcoming.length === 0 && (
                <p className="text-[10px] text-muted text-center py-2">No more holidays this year 🎉</p>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Modal for Event Details */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={() => setSelectedRecord(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-surface border border-muted/20 rounded-2xl p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedRecord(null)}
              className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold mb-4 border-b border-muted/10 pb-2">
              {!!selectedRecord.added_by ? "Manual Time Entry" : "Attendance Details"}
            </h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">Date</span>
                <p className="font-medium">{format(new Date(selectedRecord.date), "EEEE, MMMM d, yyyy")}</p>
              </div>
              
              <div className="flex justify-between items-center bg-muted/5 p-3 rounded-lg border border-muted/10">
                <div>
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Check In</span>
                  <p className="font-bold text-cyan text-lg">{selectedRecord.check_in ? formatTime(selectedRecord.check_in) : "--:--"}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Check Out</span>
                  <p className="font-bold text-cyan text-lg">{selectedRecord.check_out ? formatTime(selectedRecord.check_out) : "--:--"}</p>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">Duration</span>
                <p className="font-medium">
                  {selectedRecord.check_out && selectedRecord.check_in
                    ? `${((new Date(selectedRecord.check_out).getTime() - new Date(selectedRecord.check_in).getTime()) / 3600000).toFixed(2)} Hours`
                    : "In Progress"}
                </p>
              </div>

              {!!selectedRecord.added_by && selectedRecord.description && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-2">
                  <span className="text-xs font-semibold text-amber-500/70 uppercase tracking-wider">Admin Note</span>
                  <p className="text-sm mt-1">{selectedRecord.description}</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-muted/10 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2.5 bg-muted/10 hover:bg-muted/20 text-foreground font-semibold rounded-xl transition-all text-sm"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
