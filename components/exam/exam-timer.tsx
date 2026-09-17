"use client";

import { useEffect, useState, useMemo } from "react";
import { useExamRuntimeStore } from "@/store/use-exam-runtime-store";
import { useExamStore } from "@/store/use-exam-store";
import { QuestionRepository } from "@/lib/repository/question-repository";
import { Clock } from "lucide-react";
import { motion } from "motion/react";

export function ExamTimer() {
  const status = useExamRuntimeStore((state) => state.activeSession?.status);
  const elapsed = useExamRuntimeStore((state) => state.activeSession?.elapsedSeconds || 0);
  const tickTimer = useExamRuntimeStore((state) => state.tickTimer);
  const submitSession = useExamRuntimeStore((state) => state.submitSession);
  const { currentDraft } = useExamStore();

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (status === "IN_PROGRESS") {
      intervalId = setInterval(() => {
        tickTimer(); // updates the store
      }, 1000);
    }

    return () => clearInterval(intervalId);
  }, [status, tickTimer]);

  const TOTAL_TIME = useMemo(() => {
    if (!currentDraft) return 10800; // default to 3 hours
    return currentDraft.questions.reduce((acc, q) => {
      const questionData = QuestionRepository.getQuestionById(q.questionId);
      if (questionData) {
        if (questionData.marks === 2) return acc + 216;
        if (questionData.marks === 1) return acc + 108;
        return acc + (questionData.marks * 108);
      }
      return acc + 108;
    }, 0);
  }, [currentDraft]);

  const remaining = Math.max(0, TOTAL_TIME - elapsed);

  useEffect(() => {
    if (remaining === 0 && status === "IN_PROGRESS") {
      submitSession();
    }
  }, [remaining, status, submitSession]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const estFinishTime = useMemo(() => {
    const end = new Date(Date.now() + remaining * 1000);
    return end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
  }, [remaining]);

  const remainingRatio = TOTAL_TIME > 0 ? remaining / TOTAL_TIME : 0;
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - remainingRatio);

  return (
    <div className="flex items-center gap-4 text-xs font-bold text-[var(--text-secondary)] select-none">
      {/* SVG Timer Progress Ring */}
      <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="20"
            cy="20"
            r={radius}
            className="stroke-gray-200 dark:stroke-gray-800 fill-none"
            strokeWidth="3"
          />
          <motion.circle
            cx="20"
            cy="20"
            r={radius}
            className={`fill-none ${
              remainingRatio <= 0.15 
                ? 'stroke-rose-500' 
                : remainingRatio <= 0.3 
                  ? 'stroke-amber-500' 
                  : 'stroke-indigo-500'
            }`}
            strokeWidth="3"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ ease: "linear" }}
            strokeLinecap="round"
          />
        </svg>
        <Clock className={`w-4 h-4 absolute ${remainingRatio <= 0.15 ? 'text-rose-500 animate-pulse' : 'text-[var(--text-muted)]'}`} />
      </div>
      
      {/* Time Stats Columns */}
      <div className="flex flex-col font-mono">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-black text-[var(--text-primary)] leading-none">{formatTime(remaining)}</span>
          <span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-wider leading-none">rem</span>
        </div>
        <div className="flex gap-2 text-[9px] text-[var(--text-muted)] uppercase tracking-wider mt-1 font-semibold whitespace-nowrap">
          <span>Elapsed: {formatTime(elapsed)}</span>
          <span>•</span>
          <span>Est. End: {estFinishTime}</span>
        </div>
      </div>
    </div>
  );
}
