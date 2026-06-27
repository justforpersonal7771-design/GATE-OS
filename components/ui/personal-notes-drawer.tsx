"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, StickyNote } from "lucide-react";

interface PersonalNotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  title?: string;
}

export function PersonalNotesDrawer({
  isOpen,
  onClose,
  notes,
  onNotesChange,
  title = "Personal Notes",
}: PersonalNotesDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black z-40"
          />

          {/* Drawer container */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="absolute top-0 right-0 bottom-0 w-80 sm:w-96 bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl z-50 flex flex-col h-full overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--surface-secondary)]">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-wider text-xs">
                <StickyNote className="w-4 h-4" />
                <span>{title}</span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md text-[var(--text-muted)] hover:bg-gray-200 dark:hover:bg-gray-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Note Textarea Area */}
            <div className="flex-1 p-5 flex flex-col gap-3">
              <p className="text-xs text-[var(--text-secondary)]">
                Add formulas, shortcuts, hints, or personal notes to this question for future reference.
              </p>
              <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Write your note here... (Changes are saved automatically)"
                className="w-full flex-1 p-4 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm leading-relaxed"
              />
            </div>

            {/* Footer */}
            <button
              onClick={onClose}
              className="p-4 border-t border-[var(--border-subtle)] text-center bg-[var(--surface-secondary)] hover:bg-[var(--surface-elevated)] transition-colors text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-bold uppercase tracking-wider cursor-pointer w-full"
            >
              Save & Close Note
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
