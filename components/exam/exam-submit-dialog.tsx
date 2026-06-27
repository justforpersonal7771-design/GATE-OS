"use client";

import { Button } from "@/components/ui/button";

interface ExamSubmitDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  stats: {
    total: number;
    answered: number;
    notAnswered: number;
    marked: number;
    markedAndAnswered: number;
    notVisited: number;
  };
}

export function ExamSubmitDialog({
  isOpen,
  onConfirm,
  onCancel,
  stats,
}: ExamSubmitDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Submit Exam
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            You cannot modify answers after submission.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[var(--surface-secondary)] p-4 rounded-xl border border-[var(--border-subtle)]">
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {stats.total}
              </div>
              <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mt-1">
                Total
              </div>
            </div>
            <div className="bg-[var(--success)]/10 p-4 rounded-xl border border-[var(--success)]/20">
              <div className="text-2xl font-bold text-[var(--success)]">
                {stats.answered}
              </div>
              <div className="text-xs font-semibold text-[var(--success)] uppercase tracking-wider mt-1">
                Answered
              </div>
            </div>
            <div className="bg-[var(--warning)]/10 p-4 rounded-xl border border-[var(--warning)]/20">
              <div className="text-2xl font-bold text-[var(--warning)]">
                {stats.marked}
              </div>
              <div className="text-xs font-semibold text-[var(--warning)] uppercase tracking-wider mt-1">
                Marked
              </div>
            </div>
            <div className="bg-[var(--info)]/10 p-4 rounded-xl border border-[var(--info)]/20">
              <div className="text-2xl font-bold text-[var(--info)]">
                {stats.markedAndAnswered}
              </div>
              <div className="text-xs font-semibold text-[var(--info)] uppercase tracking-wider mt-1">
                Marked + Answered
              </div>
            </div>
            <div className="bg-[var(--danger)]/10 p-4 rounded-xl border border-[var(--danger)]/20">
              <div className="text-2xl font-bold text-[var(--danger)]">
                {stats.notAnswered}
              </div>
              <div className="text-xs font-semibold text-[var(--danger)] uppercase tracking-wider mt-1">
                Not Answered
              </div>
            </div>
            <div className="bg-[var(--surface-elevated)] p-4 rounded-xl border border-[var(--border)]">
              <div className="text-2xl font-bold text-[var(--text-secondary)]">
                {stats.notVisited}
              </div>
              <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mt-1">
                Not Visited
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-[var(--surface-secondary)] flex justify-end gap-3 border-t border-[var(--border-subtle)]">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Confirm Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
