"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";

export default function ErrorModal({
  open,
  title,
  message,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-sm bg-surface border border-muted/10 rounded-2xl shadow-2xl overflow-hidden p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
                <AlertCircle size={24} className="text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-2">{title}</h2>
              <p className="text-sm text-muted mb-8 px-4">{message}</p>
              <div className="flex justify-center">
                <button type="button" onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold text-foreground border border-muted/20 hover:bg-muted/5 transition-all">Dismiss</button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
