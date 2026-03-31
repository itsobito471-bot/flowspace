import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileSpreadsheet, Loader2, AlertCircle } from "lucide-react";
import * as xlsx from "xlsx";

interface ExportReportModalProps {
  open: boolean;
  onClose: () => void;
}

const MONTHS = [
  { value: 1, label: "January" }, { value: 2, label: "February" },
  { value: 3, label: "March" }, { value: 4, label: "April" },
  { value: 5, label: "May" }, { value: 6, label: "June" },
  { value: 7, label: "July" }, { value: 8, label: "August" },
  { value: 9, label: "September" }, { value: 10, label: "October" },
  { value: 11, label: "November" }, { value: 12, label: "December" }
];

export default function ExportReportModal({ open, onClose }: ExportReportModalProps) {
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/monthly?month=${month}&year=${year}`);
      const json = await res.json();
      
      if (!json.success) {
        throw new Error(json.message || "Failed to fetch report data.");
      }

      const data = json.data;
      if (!data || data.length === 0) {
        throw new Error("No data found for this period.");
      }

      // 1. Create a new workbook and generate a worksheet from the JSON
      const worksheet = xlsx.utils.json_to_sheet(data);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, `${MONTHS[month-1].label} ${year}`);

      // 2. Adjust column widths
      const cols = Object.keys(data[0]).map(key => ({ wch: Math.max( key.length, 15 ) }));
      worksheet["!cols"] = cols;

      // 3. Write Excel file and trigger download
      xlsx.writeFile(workbook, `Monthly_Report_${MONTHS[month-1].label}_${year}.xlsx`);
      
      onClose();
    } catch (e: any) {
      setError(e.message || "Something went wrong generating the Excel file.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-background border border-muted/10 rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-cyan/40 transition-all cursor-pointer";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }} 
            transition={{ type: "spring", stiffness: 280, damping: 28 }} 
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-sm bg-surface border border-muted/10 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-5 border-b border-muted/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <FileSpreadsheet size={15} className="text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Export Excel Report</h2>
                    <p className="text-[10px] text-muted">Generate a monthly HR aggregate</p>
                  </div>
                </div>
                <button onClick={onClose} className="text-muted hover:text-foreground w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/10 transition-all">
                  <X size={15} />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold tracking-widest uppercase text-muted/80">Reporting Month</label>
                  <select 
                    value={month} 
                    onChange={e => setMonth(Number(e.target.value))} 
                    className={inputCls}
                  >
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold tracking-widest uppercase text-muted/80">Reporting Year</label>
                  <select 
                    value={year} 
                    onChange={e => setYear(Number(e.target.value))} 
                    className={inputCls}
                  >
                    {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-muted/10">
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted border border-muted/20 hover:bg-muted/5 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleExport}
                  disabled={loading} 
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-emerald-950 hover:bg-emerald-400 focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-sm shadow-emerald-500/20"
                >
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Generating…</> : "Download .xlsx"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
