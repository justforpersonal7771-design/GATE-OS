"use client";

import { useExamRuntimeStore } from "@/store/use-exam-runtime-store";
import { useExamStore } from "@/store/use-exam-store";
import { useCallback, useMemo } from "react";
import { QuestionRepository } from "@/lib/repository/question-repository";
import { motion } from "motion/react";

export function QuestionPalette() {
  const { currentDraft } = useExamStore();
  const responses = useExamRuntimeStore((state) => state.activeSession?.responses);
  const totalQuestions = useExamRuntimeStore((state) => state.activeSession?.totalQuestions || 0);
  const currentQuestionIndex = useExamRuntimeStore((state) => state.activeSession?.currentQuestionIndex || 0);
  const goToQuestion = useExamRuntimeStore((state) => state.goToQuestion);

  const currentQData = (currentDraft && currentDraft.questions[currentQuestionIndex])
    ? QuestionRepository.getQuestionById(currentDraft.questions[currentQuestionIndex].questionId)
    : null;
  const currentSection = currentQData?.section || "Unknown";

  const sectionQuestions = useMemo(() => {
    if (!currentDraft) return [];
    return currentDraft.questions
      .map((q, idx) => ({
        q,
        idx,
        qData: QuestionRepository.getQuestionById(q.questionId),
      }))
      .filter((item) => (item.qData?.section || "Unknown") === currentSection);
  }, [currentDraft, currentSection]);

  const responsesList = useMemo(() => {
    if (!responses) return [];
    return sectionQuestions.map((sq) => responses[sq.q.questionId]);
  }, [sectionQuestions, responses]);

  const stats = useMemo(() => {
    return {
      answered: responsesList.filter((r) => r?.status === "ANSWERED").length,
      notAnswered: responsesList.filter((r) => r?.status === "VISITED").length,
      notVisited: responsesList.filter((r) => r?.status === "NOT_VISITED").length,
      marked: responsesList.filter((r) => r?.status === "MARKED").length,
      markedAndAnswered: responsesList.filter((r) => r?.status === "MARKED_AND_ANSWERED").length,
    };
  }, [responsesList]);

  const handleJump = useCallback(
    (index: number) => {
      goToQuestion(index);
    },
    [goToQuestion],
  );

  if (!responses || !currentDraft) return null;

  return (
    <div className="h-full flex flex-col pt-0 bg-[var(--surface)] overflow-hidden divide-y divide-[var(--border)]">
      
      {/* 1. Header Metadata Section (Section, Subject, Topic) */}
      <div className="flex-none bg-[var(--surface-secondary)] border-b border-[var(--border)] p-4 sm:p-5">
        {currentQData ? (
          <div className="space-y-3">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-0.5">Current Section</span>
              <span className="text-xs font-bold text-[var(--text-primary)] block truncate" title={currentQData.section}>{currentQData.section || "N/A"}</span>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-0.5">Current Subject</span>
              <span className="text-xs font-bold text-[var(--text-primary)] block truncate" title={currentQData.subject}>{currentQData.subject || "N/A"}</span>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-0.5">Current Topic</span>
              <span className="text-xs font-bold text-[var(--text-primary)] block truncate" title={currentQData.topic}>{currentQData.topic || "N/A"}</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* 2. Legend Status Counters */}
      <div className="flex-none p-4 sm:p-5 bg-[var(--surface-secondary)]">
        <div className="grid grid-cols-2 gap-3 text-xs font-bold uppercase text-[var(--text-secondary)]">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded bg-green-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">{stats.answered}</span>
            <span>Answered</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded bg-red-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">{stats.notAnswered}</span>
            <span>Not Answered</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text-secondary)] flex items-center justify-center text-[10px] font-bold shadow-sm">{stats.notVisited}</span>
            <span>Not Visited</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded bg-purple-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">{stats.marked}</span>
            <span>Marked</span>
          </div>
          <div className="flex items-center gap-2.5 col-span-2">
            <div className="w-5 h-5 bg-purple-500 rounded flex items-center justify-center text-white relative shadow-sm shrink-0">
               <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-[1.5px] border-[var(--surface)]" />
            </div>
            <span>Marked & Answered ({stats.markedAndAnswered})</span>
          </div>
        </div>
      </div>

      {/* 3. Center Aligned Questions Palette Grid */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
        <div className="grid grid-cols-5 gap-2 max-w-[280px] mx-auto justify-items-center">
          {sectionQuestions.map(({ q, idx }) => {
            const localQId = q.questionId;
            const st = responses[localQId]?.status;
            const isCurrent = currentQuestionIndex === idx;

            let colorClass = "bg-[var(--surface-elevated)] text-[var(--text-secondary)] border-[var(--border)]";

            if (st === "ANSWERED") {
              colorClass = "bg-green-500 text-white border-green-600 dark:border-green-400 shadow-sm";
            } else if (st === "VISITED") {
              colorClass = "bg-red-500 text-white border-red-600 dark:border-red-400 shadow-sm";
            } else if (st === "MARKED") {
              colorClass = "bg-purple-500 text-white border-purple-600 dark:border-purple-400 shadow-sm";
            } else if (st === "MARKED_AND_ANSWERED") {
              colorClass = "bg-purple-500 text-white border-purple-600 dark:border-purple-400 shadow-sm relative";
            }

            return (
              <motion.button
                key={localQId || idx}
                onClick={() => handleJump(idx)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className={`aspect-square w-11 rounded-xl flex items-center justify-center font-bold text-xs transition border cursor-pointer ${colorClass} ${
                  isCurrent
                    ? "ring-2 ring-inset ring-[var(--surface)] shadow-[0_0_0_2px_theme(colors.indigo.500)] scale-105"
                    : ""
                }`}
              >
                {idx + 1}
                {st === "MARKED_AND_ANSWERED" && (
                  <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border border-[var(--surface)]" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
