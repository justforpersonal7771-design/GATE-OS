"use client";

import { motion } from "motion/react";
import { Eye, RotateCcw, Calendar, CheckSquare, Award } from "lucide-react";
import { useRouter } from "next/navigation";
import { RecentSessionSummary } from "@/types/analytics.types";

interface RecentExamsProps {
  recentSessions: RecentSessionSummary[];
  onRetry: (session: RecentSessionSummary) => void;
}

export function RecentExams({ recentSessions, onRetry }: RecentExamsProps) {
  const router = useRouter();

  // Helper to format date
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "N/A";
    }
  };

  const handleReview = (id: string) => {
    router.push(`/exam/results/review?id=${id}`);
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-6 py-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--surface-secondary)]">
        <h3 className="font-extrabold text-xs uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1.5">
          <Award className="w-4 h-4 text-indigo-500" />
          <span>Recent Mock Exams</span>
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[380px] custom-scrollbar divide-y divide-[var(--border-subtle)]">
        {recentSessions.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-secondary)] flex flex-col items-center justify-center">
            <CheckSquare className="w-10 h-10 mb-2 text-gray-300 dark:text-gray-700" />
            <p className="text-sm font-medium">No mock test sessions attempted yet.</p>
          </div>
        ) : (
          recentSessions.map((session, index) => {
            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-5 hover:bg-[var(--surface-secondary)]/50 transition-colors flex flex-col sm:flex-row justify-between sm:items-center gap-4"
              >
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">
                    {session.config?.name || "GATE Mock Session"}
                  </h4>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)] font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(session.startedAt)}
                    </span>
                    {session.status === "SUBMITTED" && (
                      <span className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" />
                        {session.accuracy}% · {session.correct}/{session.attempted} correct
                      </span>
                    )}
                    <span className="capitalize font-bold text-indigo-600 dark:text-indigo-400">
                      {session.status.toLowerCase().replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => handleReview(session.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[var(--surface-secondary)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Review</span>
                  </button>
                  <button
                    onClick={() => onRetry(session)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-900/40 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Practice Again</span>
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
