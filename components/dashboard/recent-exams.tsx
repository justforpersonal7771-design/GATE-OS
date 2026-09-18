"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, RotateCcw, Calendar, CheckSquare, Award, ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { RecentSessionSummary } from "@/types/analytics.types";
import { describeTestConfig } from "@/lib/exam/describe-test-config";
import { GoalTagBadge } from "@/components/ui/goal-tag-badge";
import { useExamStore } from "@/store/use-exam-store";
import { useExamRuntimeStore } from "@/store/use-exam-runtime-store";

interface RecentExamsProps {
  recentSessions: RecentSessionSummary[];
}

export function RecentExams({ recentSessions }: RecentExamsProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [relaunchingId, setRelaunchingId] = useState<string | null>(null);

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

  // Relaunches the exact same config (fresh question sample, same filters) instead of
  // dropping the user on a blank Setup page with no memory of what they last practiced.
  const handlePracticeAgain = async (session: RecentSessionSummary) => {
    if (relaunchingId) return;
    setRelaunchingId(session.id);
    try {
      useExamStore.getState().createDraft(session.testConfig);
      const draft = useExamStore.getState().currentDraft;
      if (draft) {
        await useExamRuntimeStore.getState().startSession(draft);
        router.push("/exam/session");
      }
    } finally {
      setRelaunchingId(null);
    }
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
            const isExpanded = expandedId === session.id;
            const testConfig = session.testConfig;
            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="hover:bg-[var(--surface-secondary)]/50 transition-colors"
              >
                <div className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : session.id)}
                    className="flex items-start gap-2 text-left cursor-pointer flex-1 min-w-0"
                  >
                    <ChevronDown className={`w-4 h-4 mt-0.5 shrink-0 text-[var(--text-muted)] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">
                          {testConfig ? describeTestConfig(testConfig) : "GATE Mock Session"}
                        </h4>
                        {testConfig?.goalTag && <GoalTagBadge tag={testConfig.goalTag} />}
                      </div>

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
                  </button>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      onClick={() => handleReview(session.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[var(--surface-secondary)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review</span>
                    </button>
                    <button
                      onClick={() => handlePracticeAgain(session)}
                      disabled={!testConfig || relaunchingId === session.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-900/40 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {relaunchingId === session.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <RotateCcw className="w-3.5 h-3.5" />}
                      <span>Practice Again</span>
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && testConfig && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pl-11 flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-semibold text-[var(--text-secondary)]">
                        <span><span className="text-[var(--text-muted)]">Type:</span> {testConfig.examType.replace("_", " ")}</span>
                        {testConfig.subject && <span><span className="text-[var(--text-muted)]">Subject:</span> {testConfig.subject}</span>}
                        {testConfig.topics && testConfig.topics.length > 0 && (
                          <span><span className="text-[var(--text-muted)]">Topics:</span> {testConfig.topics.length > 2 ? `${testConfig.topics.slice(0, 2).join(", ")} +${testConfig.topics.length - 2} more` : testConfig.topics.join(", ")}</span>
                        )}
                        {testConfig.section && <span><span className="text-[var(--text-muted)]">Section:</span> {testConfig.section}</span>}
                        {testConfig.yearShift && <span><span className="text-[var(--text-muted)]">Paper:</span> {testConfig.yearShift}</span>}
                        {typeof testConfig.questionCount === "number" && <span><span className="text-[var(--text-muted)]">Questions:</span> {testConfig.questionCount}</span>}
                        <span><span className="text-[var(--text-muted)]">Score:</span> {session.score.totalScore}/{session.score.maxScore}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
