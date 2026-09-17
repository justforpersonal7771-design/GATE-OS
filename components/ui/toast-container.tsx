"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useToastStore, ToastType } from "@/store/use-toast-store";

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const COLORS: Record<ToastType, string> = {
  success: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5",
  error: "text-rose-500 border-rose-500/20 bg-rose-500/5",
  info: "text-indigo-500 border-indigo-500/20 bg-indigo-500/5",
};

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none max-w-[360px]">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md bg-[var(--surface)]/95 ${COLORS[toast.type]}`}
            >
              <Icon className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="text-xs font-semibold text-[var(--text-primary)] leading-relaxed">
                {toast.message}
              </span>
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 ml-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
