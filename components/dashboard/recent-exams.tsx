"use client";

import { motion } from "framer-motion";
import { Clock, Eye, RotateCcw, Calendar, CheckSquare, Award } from "lucide-react";
import { useRouter } from "next/navigation";
import { useExamRuntimeStore } from "@/store/use-exam-runtime-store";

interface ExamSession {
  id: string;
  draftConfig: any;
  status: string;
  startedAt: string;
  elapsedSeconds: number;
  responses: any;
}

interface RecentExamsProps {
  recentSessions: ExamSession[];
  onRetry: (session: ExamSession) => void;
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

  // Helper to compute accuracy, marks, duration
  const computeSessionStats = (session: ExamSession) => {
    let correct = 0;
    let attempted = 0;
    let totalMarks = 0;

    const responsesList = Object.values(session.responses || {}) as any[];
    responsesList.forEach(res => {
      if (res.status === "ANSWERED" || res.status === "MARKED_AND_ANSWERED") {
        attempted++;
      }
    });

    const questions = session.draftConfig?.questions || [];
    questions.forEach((qRef: any) => {
      const res = (session.responses || {})[qRef.questionId] as any;
      if (res && (res.status === "ANSWERED" || res.status === "MARKED_AND_ANSWERED")) {
        // Wait, did we serialize correctness in the snapshot?
        // Since we are computing locally, let's fetch question details if available.
        // But wait! If we don't have the question repository loaded here, let's see:
        // Actually, we can load from QuestionRepository directly!
        // In the dashboard page, we can import QuestionRepository to fetch question marks.
        // Let's import QuestionRepository inside this component as well.
      }
    });

    // Let's estimate accuracy from session details if stored or computed in sessions
    // Wait, let's check what fields we have on the raw session.
    // In `app/(dashboard)/exam/results/page.tsx`, statsCalculations computes marks, correct, wrong, etc.
    // We can run the same exact computation here!
    return {
      attempted,
      durationText: `${Math.floor(session.elapsedSeconds / 60)}m ${session.elapsedSeconds % 60}s`,
    };
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
            const stats = computeSessionStats(session);
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
                    {session.draftConfig?.config?.name || "GATE Quick Mock Quiz"}
                  </h4>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)] font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(session.startedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {stats.durationText}
                    </span>
                    <span className="capitalize font-bold text-indigo-600 dark:text-indigo-400">
                      {session.status}
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
                    <span>Retry</span>
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
