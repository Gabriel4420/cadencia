import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Award, Bell, CheckCircle2, Info, X } from 'lucide-react';
import type { ToastItem } from '../types';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-20 right-4 z-50 flex w-full max-w-xs flex-col gap-2.5 md:bottom-5 md:right-5"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-4 py-3 shadow-lg"
          >
            <div className="mt-0.5 shrink-0">
              {toast.tone === 'reward' && <Award className="h-4 w-4 accent-text" />}
              {toast.tone === 'success' && (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              )}
              {toast.tone === 'warning' && (
                <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              )}
              {toast.tone === 'info' && (
                <Info className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {toast.title}
              </p>
              {toast.description && (
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 leading-snug">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label={`Fechar aviso ${toast.title}`}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
