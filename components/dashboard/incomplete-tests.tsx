"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Play, Trash2, Loader2 } from "lucide-react";
import { ExamSession } from "@/types/exam-runtime.types";
import { SessionManager } from "@/lib/exam/session-manager";
import { useExamRuntimeStore } from "@/store/use-exam-runtime-store";
import { describeTestConfig } from "@/lib/exam/describe-test-config";

/** Tests left mid-way (not submitted) that got bumped out of the single active-session
 * slot by a newer test — previously silently lost, now tracked and resumable here. */
export function IncompleteTests() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = async () => {
    const list = await SessionManager.getIncompleteSessions();
    setSessions(list.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()));
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleResume = async (session: ExamSession) => {
    setBusyId(session.id);
    try {
      await useExamRuntimeStore.getState().resumeArchivedSession(session);
      router.push("/exam/session");
    } finally {
      setBusyId(null);
    }
  };

  const handleDiscard = async (session: ExamSession) => {
    setBusyId(session.id);
    try {
      await SessionManager.discardIncomplete(session.id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  if (loading || sessions.length === 0) return null;

  return (
    <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wide">
          Incomplete Tests ({sessions.length})
        </h3>
      </div>

      <AnimatePresence initial={false}>
        {sessions.map((session) => {
          const answered = Object.values(session.responses).filter(
            (r) => r.status === "ANSWERED" || r.status === "MARKED_AND_ANSWERED"
          ).length;
          return (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between gap-3 p-3 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-xl overflow-hidden"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                  {describeTestConfig(session.draftConfig.config)}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] font-semibold">
                  {answered}/{session.totalQuestions} answered · left off at Q{session.currentQuestionIndex + 1}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleResume(session)}
                  disabled={busyId === session.id}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-wide rounded-lg transition-colors cursor-pointer"
                >
                  {busyId === session.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  Resume
                </button>
                <button
                  onClick={() => handleDiscard(session)}
                  disabled={busyId === session.id}
                  className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  title="Discard"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
