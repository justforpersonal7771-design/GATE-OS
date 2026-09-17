"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStudyStore } from "@/store/use-study-store";
import { useAnalyticsStore } from "@/store/use-analytics-store";
import { QuestionRepository } from "@/lib/repository/question-repository";
import { RenderableQuestion } from "@/types/question.types";
import { AstNodeRenderer } from "@/components/exam/ast-node-renderer";
import { MathJaxContext } from "better-react-mathjax";
import { Loader2, ArrowLeft, ArrowRight, ChevronLeft } from "lucide-react";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import { FullscreenNavigation } from "@/components/ui/fullscreen-navigation";

function RevisionSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "mistakes";
  
  const { mistakes, bookmarks, markMistakeMastered } = useStudyStore();
  const { dashboardMetrics } = useAnalyticsStore();
  
  const [questions, setQuestions] = useState<RenderableQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let qIds: string[] = [];
    if (mode === "mistakes") {
      qIds = mistakes.filter(m => !m.mastered).map(m => m.questionId);
    } else if (mode === "bookmarks") {
      qIds = bookmarks.map(b => b.questionId);
    } else if (mode === "weak_topics") {
      if (dashboardMetrics) {
        const weakTopics = dashboardMetrics.topicPerformance
          .filter(t => t.attempted >= 3 && (t.correct / t.attempted) * 100 < 50)
          .map(t => t.topic);
          
        const allQuestions = QuestionRepository.getAllQuestions();
        qIds = allQuestions.filter(q => weakTopics.includes(q.topic || "")).map(q => q.question_id);
      }
    }
    
    const loadedQuestions = qIds.map(id => QuestionRepository.getQuestionById(id)).filter(Boolean) as RenderableQuestion[];
    setQuestions(loadedQuestions);
    setLoading(false);
  }, [mode, mistakes, bookmarks, dashboardMetrics]);

  const currentQuestion = questions[currentIndex];

  const currentEntry = useMemo(() => {
    if (!currentQuestion) return null;
    if (mode === "mistakes") {
      return mistakes.find(m => m.questionId === currentQuestion.question_id);
    } else if (mode === "bookmarks") {
      return bookmarks.find(b => b.questionId === currentQuestion.question_id);
    }
    return null;
  }, [mode, mistakes, bookmarks, currentQuestion]);

  const selectedOptions = currentEntry?.selectedOptions || [];
  const natValue = currentEntry?.natValue || "";

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  if (questions.length === 0) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto">
        <h2 className="text-xl font-bold mb-4">No Questions Found</h2>
        <p className="text-[var(--text-muted)] mb-6">There are no questions available for this revision mode currently.</p>
        <button onClick={() => router.push("/revision")} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold">Go Back</button>
      </div>
    );
  }

  const mathJaxConfig = {
    loader: { load: ["[tex]/html"] },
    tex: {
      packages: { "[+]": ["html"] },
      inlineMath: [["\\(", "\\)"]],
      displayMath: [["\\[", "\\]"]],
    },
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="w-full mx-auto flex flex-col h-screen overflow-hidden">
        <div className="bg-[var(--surface)] px-6 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
             <button onClick={() => router.push("/revision")} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition">
               <ChevronLeft className="w-5 h-5 text-[var(--text-muted)]" />
             </button>
             <h1 className="font-bold text-[var(--text-primary)] capitalize">Revision: {mode.replace("_", " ")}</h1>
          </div>
          <div className="font-semibold text-[var(--text-muted)]">
            {currentIndex + 1} / {questions.length}
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative flex flex-col w-full h-full bg-[var(--surface-secondary)] p-4 md:p-6">
          <div id="revision-question-container" className="flex-1 flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm relative overflow-hidden h-full">
            <div className="absolute top-4 right-4 z-50">
              <FullscreenToggle targetId="revision-question-container" />
            </div>
            
            <FullscreenNavigation
              onPrev={currentIndex > 0 ? () => setCurrentIndex(i => i - 1) : undefined}
              onNext={currentIndex < questions.length - 1 ? () => setCurrentIndex(i => i + 1) : undefined}
              isPrevDisabled={currentIndex === 0}
              isNextDisabled={currentIndex === questions.length - 1}
            />

            {/* Question Text (Scrollable) */}
            <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.question_id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              className="flex-1 overflow-y-auto px-6 py-8 sm:px-12 custom-scrollbar pt-12 sm:pt-14"
            >
              <div className="text-lg md:text-xl font-medium leading-relaxed text-[var(--text-primary)] mb-8">
                 <AstNodeRenderer nodes={currentQuestion.contentAst} />
              </div>
            </motion.div>
            </AnimatePresence>

            {/* Options or NAT Answer Highlight Area */}
            <div className="flex-none p-6 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)] shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.02)] z-10 w-full">
              <div className="w-full">
                {(currentQuestion.question_type === "MCQ" || currentQuestion.question_type === "MSQ") && (
                   <div className={`grid gap-3 ${currentQuestion.options?.some(opt => opt.contentAst.some(n => n.type === 'image')) ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
                     {currentQuestion.options?.map(o => {
                        const isActuallyCorrect = o.is_correct;
                        const isUserSelected = (selectedOptions || []).includes(o.option_id);
                        let borderClass = "border-[var(--border)] bg-[var(--surface)]";
                        
                        if (isActuallyCorrect && isUserSelected) borderClass = "border-green-500 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500";
                        else if (isActuallyCorrect && !isUserSelected) borderClass = "border-green-500 bg-[var(--surface)] ring-2 ring-green-500 border-transparent border-dashed text-green-700 dark:text-green-500";
                        else if (!isActuallyCorrect && isUserSelected) borderClass = "border-red-500 bg-red-50 dark:bg-red-900/20 ring-1 ring-red-500 text-red-700 dark:text-red-500";

                        return (
                          <div key={o.option_id} className={`p-4 border-[2px] rounded-xl ${borderClass} overflow-hidden`}>
                            <div className="flex items-start gap-3 w-full">
                               <div className="shrink-0 font-black text-inherit w-5 mt-0.5">{o.option_id}.</div>
                               <div className="text-[var(--text-primary)] max-w-full overflow-hidden break-words"><AstNodeRenderer nodes={o.contentAst} /></div>
                            </div>
                          </div>
                        );
                     })}
                   </div>
                )}
                 {currentQuestion.question_type === "NAT" && (
                   <div className="flex flex-col sm:flex-row gap-4 p-4 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-2xl w-full">
                     <div className="flex-1 flex justify-between items-center bg-[var(--surface)] p-3 border border-[var(--border-subtle)] rounded-xl">
                       <span className="text-[10px] font-black text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-widest">Correct Answer Range</span>
                       <span className="font-mono font-bold text-green-600 dark:text-green-400">
                         {currentQuestion.nat_answer_range?.min} {currentQuestion.nat_answer_range?.min !== currentQuestion.nat_answer_range?.max && `- ${currentQuestion.nat_answer_range?.max}`}
                       </span>
                     </div>
                     {natValue && (
                       <div className={`flex-1 flex justify-between items-center bg-[var(--surface)] p-3 border rounded-xl ${
                         parseFloat(natValue) >= (currentQuestion.nat_answer_range?.min || 0) &&
                         parseFloat(natValue) <= (currentQuestion.nat_answer_range?.max || 0)
                           ? 'border-green-500 text-green-700 dark:text-green-500'
                           : 'border-red-500 text-red-700 dark:text-red-500'
                       }`}>
                         <span className="text-[10px] font-black text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-widest">Your Answer</span>
                         <span className="font-mono font-bold">{natValue}</span>
                       </div>
                     )}
                   </div>
                 )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface)] border-t border-[var(--border)] p-4 shrink-0 flex justify-between items-center z-20">
          <motion.button
            whileTap={{ scale: 0.96 }}
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(i => i - 1)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[var(--surface-secondary)] border border-[var(--border)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] font-bold rounded-lg transition disabled:opacity-50 cursor-pointer"
          >
             <ArrowLeft className="w-4 h-4" /> Prev
          </motion.button>

          {mode === "mistakes" && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                markMistakeMastered(currentQuestion.question_id);
                if (currentIndex < questions.length - 1) {
                  setCurrentIndex(i => i + 1);
                }
              }}
              className="px-6 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-400 font-bold rounded-lg transition cursor-pointer"
            >
               Mark Mastered
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.96 }}
            disabled={currentIndex === questions.length - 1}
            onClick={() => setCurrentIndex(i => i + 1)}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition disabled:opacity-50 cursor-pointer"
          >
             Next <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </MathJaxContext>
  );
}

export default function RevisionSessionPage() {
  return (
    <Suspense fallback={<div className="p-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></div>}>
      <RevisionSessionContent />
    </Suspense>
  )
}
