"use client";

import { useExamRuntimeStore } from "@/store/use-exam-runtime-store";
import { useExamStore } from "@/store/use-exam-store";
import { QuestionRepository } from "@/lib/repository/question-repository";
import { useMemo } from "react";
import { motion } from "motion/react";

export function SectionTabs() {
  const { currentDraft } = useExamStore();
  const currentQuestionIndex = useExamRuntimeStore(
    (state) => state.activeSession?.currentQuestionIndex || 0,
  );
  const goToQuestion = useExamRuntimeStore((state) => state.goToQuestion);

  const sections = useMemo(() => {
    if (!currentDraft) return [];

    const secMap = new Map<string, { startIdx: number; count: number }>();

    currentDraft.questions.forEach((q, idx) => {
      const qData = QuestionRepository.getQuestionById(q.questionId);
      const sectionName = qData?.section || "Unknown";
      if (!secMap.has(sectionName)) {
        secMap.set(sectionName, { startIdx: idx, count: 1 });
      } else {
        const entry = secMap.get(sectionName)!;
        entry.count++;
        secMap.set(sectionName, entry);
      }
    });

    return Array.from(secMap.entries()).map(([name, data]) => ({
      name,
      ...data,
    }));
  }, [currentDraft]);

  const currentQData = useMemo(() => {
    if (!currentDraft || !currentDraft.questions[currentQuestionIndex]) return null;
    return QuestionRepository.getQuestionById(currentDraft.questions[currentQuestionIndex].questionId);
  }, [currentDraft, currentQuestionIndex]);

  const activeSectionName = currentQData?.section || "Unknown";

  if (sections.length <= 1) return null;

  return (
    <div 
      className="flex w-full bg-[var(--surface)] border-b border-[var(--border)] px-0 pt-0 gap-0 overflow-x-auto shrink-0"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {sections.map((sec) => {
        const isActive = activeSectionName === sec.name;
        return (
          <button
            key={sec.name}
            onClick={() => goToQuestion(sec.startIdx)}
            className={`relative flex-1 px-4 py-4 text-xs font-black uppercase tracking-wider transition-colors whitespace-nowrap focus:outline-none ${
              isActive
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
            }`}
          >
            <span className="relative z-10">{sec.name}</span>
            {isActive && (
              <motion.div
                layoutId="activeSectionTab"
                className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            {isActive && (
              <motion.div
                layoutId="activeSectionBg"
                className="absolute inset-0 bg-gradient-to-b from-indigo-50/20 to-indigo-50/5 dark:from-indigo-900/10 dark:to-transparent"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
