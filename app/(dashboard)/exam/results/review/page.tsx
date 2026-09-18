"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { IDBManager } from "@/lib/repository/storage/idb-manager";
import { ExamSession } from "@/types/exam-runtime.types";
import { QuestionRepository } from "@/lib/repository/question-repository";
import { AstNodeRenderer } from "@/components/exam/ast-node-renderer";
import { MathJaxContext } from "better-react-mathjax";
import { useStudyStore } from "@/store/use-study-store";
import { Bookmark, BookmarkCheck, Sun, Moon, ArrowLeft, ArrowRight, Home, StickyNote, Activity, RefreshCw } from "lucide-react";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import { FullscreenNavigation } from "@/components/ui/fullscreen-navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "motion/react";

export default function ReviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams?.get("id");
  const initialQParam = searchParams?.get("q");
  const { theme, setTheme } = useTheme();

  const [session, setSession] = useState<ExamSession | null>(null);
  const [loading, setLoading] = useState(true);
  const { bookmarks, mistakes, addBookmark, removeBookmark, updateBookmarkNotes, updateMistakeNotes, loadStudyData } = useStudyStore();
  const [currentIndex, setCurrentIndex] = useState(() => {
    const parsed = initialQParam ? parseInt(initialQParam, 10) : 0;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  });

  useEffect(() => {
    loadStudyData();
  }, [loadStudyData]);

  // Clamp the deep-linked ?q= index once the session's real question count is known.
  useEffect(() => {
    if (!session) return;
    const maxIndex = Math.max(session.draftConfig.questions.length - 1, 0);
    if (currentIndex > maxIndex) setCurrentIndex(maxIndex);
  }, [session, currentIndex]);

  useEffect(() => {
    async function load() {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const record = await IDBManager.loadExamSession(id);
        if (record && record.sessionData) {
          setSession(record.sessionData as ExamSession);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--background)]">
      <div className="font-bold tracking-widest uppercase animate-pulse text-indigo-600 dark:text-indigo-400">Loading Review Engine...</div>
    </div>
  );
  if (!session) return <div className="p-8 text-center text-rose-500 font-bold bg-[var(--background)] h-screen">Result not found.</div>;

  const draftQuestions = session.draftConfig.questions;
  const currentQRef = draftQuestions[currentIndex] || draftQuestions[0];
  const qId = currentQRef.questionId;
  const q = QuestionRepository.getQuestionById(qId);
  const currentResponse = session.responses[qId];

  const handleBookmarkToggle = async () => {
    if (!q) return;
    const isBookmarked = bookmarks.some(b => b.questionId === q.question_id);
    if (isBookmarked) {
      await removeBookmark(q.question_id);
    } else {
      await addBookmark(q.question_id, "", q.subject, q.topic);
    }
  };

  const isCurrentBookmarked = bookmarks.some(b => b.questionId === q?.question_id);

  // Helper to determine correctness of any response node
  const checkCorrectness = (qIdLocal: string) => {
    let c = false;
    let a = false;
    const qLocal = QuestionRepository.getQuestionById(qIdLocal);
    const resLocal = session.responses[qIdLocal];
    if (resLocal && (resLocal.status === "ANSWERED" || resLocal.status === "MARKED_AND_ANSWERED")) {
      a = true;
      if (qLocal?.question_type === "MCQ" || qLocal?.question_type === "MSQ") {
        const correctOpts = qLocal.options.filter(o => o.is_correct).map(o => o.option_id).sort();
        const selectedOpts = [...(resLocal.selectedOptions || [])].sort();
        c = JSON.stringify(correctOpts) === JSON.stringify(selectedOpts);
      } else if (qLocal?.question_type === "NAT") {
        const val = parseFloat(resLocal.natValue || "");
        if (!isNaN(val) && qLocal.nat_answer_range) {
          c = val >= qLocal.nat_answer_range.min && val <= qLocal.nat_answer_range.max;
        }
      }
    }
    return { isAttempted: a, isCorrect: c };
  };

  const { isAttempted, isCorrect } = checkCorrectness(qId);

  const currentBookmark = bookmarks.find(b => b.questionId === qId);
  const currentMistake = mistakes.find(m => m.questionId === qId);
  const notesValue = currentBookmark?.notes || currentMistake?.notes || "";

  const handleNotesChange = async (newNotes: string) => {
    if (currentBookmark) {
      await updateBookmarkNotes(qId, newNotes);
    } else if (currentMistake) {
      await updateMistakeNotes(qId, newNotes);
    } else {
      await addBookmark(qId, newNotes, q?.subject || "", q?.topic || "");
    }
  };

  const mathJaxConfig = {
    loader: { load: ["[tex]/html"] },
    tex: { packages: { "[+]": ["html"] }, inlineMath: [["\\(", "\\)"]], displayMath: [["\\[", "\\]"]] },
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="flex flex-col h-screen w-full overflow-hidden bg-[var(--background)] font-sans">

        {/* PREMIUM COMMAND BAR (Part 1 & 9) */}
        <header className="flex-none bg-[var(--surface)] border-b border-[var(--border)] shadow-sm flex flex-col md:flex-row md:items-center justify-between px-4 py-3 sm:px-6 shrink-0 z-30 gap-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 whitespace-nowrap">
            <span className="font-extrabold text-lg text-[var(--text-primary)] tracking-tight pr-4 border-r border-[var(--border)]">
              GATE OS <span className="text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider ml-2">Review Mode</span>
            </span>

            {q && (
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
                <span className="text-[var(--text-primary)] bg-[var(--surface-secondary)] px-2.5 py-1.5 rounded-lg border border-[var(--border)] shadow-sm font-mono text-xs">
                  Q<span className="text-indigo-600 dark:text-indigo-400 font-bold mx-0.5">{currentIndex + 1}</span>
                  <span className="text-[var(--text-muted)] font-normal">/ {draftQuestions.length}</span>
                </span>
                <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 px-2.5 py-1.5 rounded-lg border border-indigo-200/50 dark:border-indigo-900/50 shadow-sm">
                  {q.question_type}
                </span>
                <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-1.5 rounded-lg border border-emerald-200/50 dark:border-indigo-900/50 shadow-sm">
                  +{q.marks} / {q.question_type === "MCQ" ? `-${(q.marks / 3).toFixed(2)}` : "0"}
                </span>
                <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 px-2.5 py-1.5 rounded-lg border border-amber-200/50 dark:border-indigo-900/50 shadow-sm">
                  {q.difficulty}
                </span>

                <span className="h-4 border-r border-[var(--border)] mx-1" />

                <span className="bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-400 px-2.5 py-1 rounded max-w-[110px] truncate inline-block text-[10px] font-bold" title={q.section}>
                  {q.section || "General"}
                </span>
                <span className="bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-400 px-2.5 py-1 rounded max-w-[110px] truncate inline-block text-[10px] font-bold" title={q.subject}>
                  {q.subject || "General"}
                </span>
                <span className="bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-400 px-2.5 py-1 rounded max-w-[110px] truncate inline-block text-[10px] font-bold" title={q.topic}>
                  {q.topic || "General"}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
            {/* Correctness Badges directly in Command Bar */}
            <div className="flex items-center gap-2">
              {isAttempted ? (
                isCorrect
                  ? <span className="px-2.5 py-1 bg-green-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm">Correct</span>
                  : <span className="px-2.5 py-1 bg-red-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm">Wrong</span>
              ) : (
                <span className="px-2.5 py-1 bg-gray-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm">Skipped</span>
              )}
            </div>

            <div className="flex items-center gap-2 border-l border-[var(--border)] pl-4 h-8 shrink-0">
              {/* Bookmark Toggle in Command Bar */}
              <button
                onClick={handleBookmarkToggle}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                title="Bookmark Question"
              >
                {isCurrentBookmarked ? <BookmarkCheck className="w-4 h-4 text-indigo-500" /> : <Bookmark className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                title="Toggle Dark Mode"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                onClick={() => router.push(`/ai-tutor?qid=${qId}`)}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-md cursor-pointer"
                title="Explain with AI Tutor"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>AI</span>
              </button>

              <button
                onClick={() => router.push(`/exam/results?id=${id}`)}
                className="px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest bg-[var(--surface-elevated)] hover:bg-[var(--surface-secondary)] text-[var(--text-primary)] rounded-lg transition shadow-md border border-[var(--border)] cursor-pointer"
              >
                Exit Review
              </button>
            </div>
          </div>
        </header>

        {/* MAIN WORKSPACE */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">

          {/* Question Workspace Component */}
          <div id="review-workspace-container" className="flex-1 flex flex-col min-w-0 bg-[var(--surface)] h-full relative z-10 w-full lg:w-auto">
            {q ? (
              <>
                {/* GPU-accelerated motion page transitions */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={qId}
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    style={{ willChange: "transform, opacity" }}
                    id="review-question-container"
                    className="flex-1 flex flex-col min-h-0 bg-[var(--surface)] relative"
                  >
                    <div className="absolute top-4 right-4 z-50">
                      <FullscreenToggle targetId="review-workspace-container" />
                    </div>

                    <FullscreenNavigation
                      onPrev={currentIndex > 0 ? () => setCurrentIndex(i => i - 1) : undefined}
                      onNext={currentIndex < draftQuestions.length - 1 ? () => setCurrentIndex(i => i + 1) : undefined}
                      isPrevDisabled={currentIndex === 0}
                      isNextDisabled={currentIndex === draftQuestions.length - 1}
                    />

                    {/* Question Content (Scrollable) */}
                    <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-12 custom-scrollbar pt-12 sm:pt-14">
                      <div className="text-lg md:text-xl font-medium leading-relaxed text-[var(--text-primary)] mb-8">
                        <AstNodeRenderer nodes={q.contentAst} />
                      </div>
                    </div>

                    {/* Options highlights (Sticky to bottom) */}
                    <div className="flex-none p-6 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)] shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.02)] z-10 w-full">
                      <div className="w-full">
                        {(q.question_type === "MCQ" || q.question_type === "MSQ") && (
                          <div className={`grid gap-3 ${q.options?.some(opt => opt.contentAst.some(n => n.type === 'image')) ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
                            {q.options?.map(o => {
                              const isActuallyCorrect = o.is_correct;
                              const isUserSelected = (currentResponse?.selectedOptions || []).includes(o.option_id);
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

                        {q.question_type === "NAT" && (
                          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full">
                            <div className="flex-1 flex justify-between items-center bg-[var(--surface-secondary)] p-3 border border-[var(--border-subtle)] rounded-xl">
                              <span className="text-[10px] font-black text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-widest">Correct Answer Range</span>
                              <span className="font-mono font-bold text-green-600 dark:text-green-400">
                                {q.nat_answer_range ? `${q.nat_answer_range.min} to ${q.nat_answer_range.max}` : "N/A"}
                              </span>
                            </div>
                            <div className={`flex-1 flex justify-between items-center bg-[var(--surface-secondary)] p-3 border rounded-xl ${isAttempted
                                ? (isCorrect
                                  ? 'border-green-500 text-green-700 dark:text-green-500'
                                  : 'border-red-500 text-red-700 dark:text-red-500')
                                : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
                              }`}>
                              <span className="text-[10px] font-black text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-widest">Your Answer</span>
                              <span className="font-mono font-bold">{currentResponse?.natValue || "None"}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* BOTTOM ACTION BAR */}
                <div className="flex-none px-4 py-4 sm:px-6 flex justify-between items-center border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur z-20">
                  <button
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(i => i - 1)}
                    className="px-6 py-3 bg-[var(--surface-secondary)] border border-[var(--border)] shadow-sm hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentIndex === draftQuestions.length - 1}
                    onClick={() => setCurrentIndex(i => i + 1)}
                    className="px-8 py-3 bg-indigo-600 text-white font-extrabold tracking-wide uppercase text-sm rounded-lg hover:bg-indigo-700 transition shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-red-500 font-bold">
                Question data missing or corrupted.
              </div>
            )}
          </div>

          {/* Right Palette (Top: Navigator, Bottom: Personal Notes) */}
          <div className="w-full lg:w-[340px] flex-none border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--surface)] z-20 flex flex-col h-[50vh] lg:h-full overflow-hidden divide-y divide-[var(--border)]">
            {/* Top Half: Review Navigator */}
            <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-5 overflow-hidden">
              <div className="font-extrabold text-xs uppercase tracking-widest text-[var(--text-muted)] mb-4 px-1">Review Navigator</div>

              <div className="flex-1 overflow-y-auto px-1 -mx-1 py-1.5 -my-1.5 custom-scrollbar content-start">
                <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2">
                  {draftQuestions.map((qRef, idx) => {
                    const resInfo = checkCorrectness(qRef.questionId);
                    let colorClass = "bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border)]";

                    if (resInfo.isAttempted) {
                      if (resInfo.isCorrect) {
                        colorClass = "bg-green-500 text-white border-green-600 dark:border-green-400 shadow-sm";
                      } else {
                        colorClass = "bg-red-500 text-white border-red-600 dark:border-red-400 shadow-sm";
                      }
                    }

                    const isCurrent = currentIndex === idx;

                    return (
                      <motion.button
                        key={qRef.questionId + idx}
                        onClick={() => setCurrentIndex(idx)}
                        whileTap={{ scale: 0.95 }}
                        className={`aspect-square w-full rounded-lg flex items-center justify-center font-bold text-sm transition-colors border focus:outline-none cursor-pointer ${colorClass} ${isCurrent
                            ? "ring-2 ring-inset ring-[var(--surface)] shadow-[0_0_0_2px_theme(colors.indigo.500)] scale-105 z-10"
                            : "hover:bg-opacity-80"
                          }`}
                      >
                        {idx + 1}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Half: Personal Notes */}
            <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-5">
              <div className="font-extrabold text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3 px-1 flex items-center gap-1.5 text-amber-500">
                <StickyNote className="w-3.5 h-3.5" />
                <span>Personal Notes</span>
              </div>
              <textarea
                value={notesValue}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Add personal hints, formulas, or reminders for this question... (Auto-saves on change)"
                className="w-full flex-1 p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-xs leading-relaxed"
              />
            </div>
          </div>

        </div>
      </div>
    </MathJaxContext>
  );
}
