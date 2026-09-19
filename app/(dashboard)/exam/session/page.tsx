"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useExamRuntimeStore } from "@/store/use-exam-runtime-store";
import { useExamStore } from "@/store/use-exam-store";
import { QuestionRepository } from "@/lib/repository/question-repository";
import { RenderableQuestion } from "@/types/question.types";
import { QuestionRenderer } from "@/components/exam/question-renderer";
import { MathJaxContext } from "better-react-mathjax";
import { useStudyStore } from "@/store/use-study-store";
import { Bookmark, BookmarkCheck, Sun, Moon, Play, Pause, AlertTriangle, ClipboardList, HelpCircle, CheckSquare, BookOpen, ChevronDown, LayoutGrid, X } from "lucide-react";
import { useDataStore } from "@/store/use-data-store";
import { ExamTimer } from "@/components/exam/exam-timer";
import { QuestionPalette } from "@/components/exam/question-palette";
import { ExamSubmitDialog } from "@/components/exam/exam-submit-dialog";
import { ImagePrefetcher } from "@/lib/exam/image-prefetcher";
import { useTheme } from "next-themes";
import { SectionTabs } from "@/components/exam/section-tabs";
import { motion, AnimatePresence } from "motion/react";

export default function ExamSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const { isInitialized, error: storeError } = useDataStore();

  const startSession = useExamRuntimeStore((state) => state.startSession);

  // Selectors to avoid re-rendering on tickTimer
  const isHydrated = useExamRuntimeStore((state) => state.isHydrated);
  const initializeStore = useExamRuntimeStore((state) => state.initializeStore);

  const activeSessionExists = useExamRuntimeStore((state) => !!state.activeSession);
  const sessionStatus = useExamRuntimeStore((state) => state.activeSession?.status);
  const sessionId = useExamRuntimeStore((state) => state.activeSession?.id);
  const currentQuestionIndex = useExamRuntimeStore((state) => state.activeSession?.currentQuestionIndex || 0);
  const totalQuestions = useExamRuntimeStore((state) => state.activeSession?.totalQuestions || 0);
  const responsesFromStore = useExamRuntimeStore((state) => state.activeSession?.responses);
  const responses = useMemo(() => responsesFromStore || {}, [responsesFromStore]);
  const sessionGoalTag = useExamRuntimeStore((state) => state.activeSession?.draftConfig?.config?.goalTag);

  const pauseSession = useExamRuntimeStore((state) => state.pauseSession);
  const resumeSession = useExamRuntimeStore((state) => state.resumeSession);
  const submitSession = useExamRuntimeStore((state) => state.submitSession);
  const nextQuestion = useExamRuntimeStore((state) => state.nextQuestion);
  const previousQuestion = useExamRuntimeStore((state) => state.previousQuestion);
  const saveResponse = useExamRuntimeStore((state) => state.saveResponse);
  const toggleMarkForReview = useExamRuntimeStore((state) => state.toggleMarkForReview);
  const clearResponseAction = useExamRuntimeStore((state) => state.clearResponse);
  const clearSession = useExamRuntimeStore((state) => state.clearSession);
  
  const { bookmarks, addBookmark, removeBookmark, loadStudyData } = useStudyStore();

  useEffect(() => {
    loadStudyData();
  }, [loadStudyData]);

  const { currentDraft } = useExamStore();
  const [mounted, setMounted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<RenderableQuestion | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isHydrated) {
      initializeStore();
    }
  }, [isHydrated, initializeStore]);

  // Derived Question ID and loading logic
  const currentQId = useMemo(() => {
    if (currentDraft && currentDraft.questions[currentQuestionIndex]) {
      return currentDraft.questions[currentQuestionIndex].questionId;
    } else if (Object.keys(responses).length > 0) {
      return Object.keys(responses)[currentQuestionIndex];
    }
    return "";
  }, [currentDraft, currentQuestionIndex, responses]);

  useEffect(() => {
    if (isInitialized && activeSessionExists && currentQId) {
      const q = QuestionRepository.getQuestionById(currentQId);
      setCurrentQuestion(q || null);

      // Prefetch next 2 questions
      const nextQId1 = currentDraft?.questions[currentQuestionIndex + 1]?.questionId || Object.keys(responses)[currentQuestionIndex + 1];
      const nextQId2 = currentDraft?.questions[currentQuestionIndex + 2]?.questionId || Object.keys(responses)[currentQuestionIndex + 2];

      const q1 = nextQId1 ? QuestionRepository.getQuestionById(nextQId1) : null;
      const q2 = nextQId2 ? QuestionRepository.getQuestionById(nextQId2) : null;

      ImagePrefetcher.prefetch([q1 || null, q2 || null]);
    }
  }, [isInitialized, activeSessionExists, currentQId, currentQuestionIndex, currentDraft, responses]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sessionStatus !== "IN_PROGRESS") return;
      
      const isInputFocused = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "");
      if (isInputFocused) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextQuestion();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        previousQuestion();
      } else if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        if (currentQId) {
          saveResponse(currentQId, { status: "MARKED" });
        }
      } else if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        if (currentQId) clearResponseAction(currentQId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sessionStatus, currentQId, nextQuestion, previousQuestion, saveResponse, clearResponseAction]);

  if (!isInitialized || storeError) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-red-500 font-bold text-lg">
          {storeError ? `Database Error: ${storeError}` : "Loading Workspace Repository..."}
        </div>
      </div>
    );
  }

  if (isHydrated && !activeSessionExists) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-8 bg-[var(--background)]">
        <div className="p-8 text-center space-y-4 max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">No Active Session</h2>
          <p className="text-[var(--text-secondary)] text-sm">
             You don't have an active exam session. Start one from the dashboard workspace.
          </p>
          <button 
            onClick={() => router.push("/")}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition shadow-sm text-sm"
          >
             Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (sessionStatus === "SUBMITTED" && sessionId) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[var(--background)]">
        <div className="p-10 text-center space-y-6 max-w-lg mx-auto bg-green-50 dark:bg-emerald-950/20 border-2 border-green-200 dark:border-emerald-800 rounded-3xl">
          <div className="w-20 h-20 bg-green-200 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto text-green-700 dark:text-emerald-400">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-3xl font-extrabold text-green-900 dark:text-emerald-400">
            Exam Submitted
          </h2>
          <p className="text-green-800 dark:text-emerald-300 font-medium">
            Your responses have been committed to the evaluation engine.
          </p>
          <button
            onClick={() => {
               // submitSession() already deleted the persisted "active_session"
               // record and deliberately kept activeSession in memory to avoid
               // this exact page flashing into its "no active session" guard
               // clause. Do NOT null it out here before navigating away - that
               // was causing this page to re-render into the empty state and
               // get stuck there instead of reaching /exam/results. Just
               // navigate; the in-memory state naturally resets on next
               // initializeStore() call since IDB has nothing to restore.
               router.push(`/exam/results?id=${sessionId}`);
            }}
            className="mt-6 px-10 py-4 w-full bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-black tracking-widest uppercase shadow-lg shadow-green-500/30"
          >
            Compute Results
          </button>
        </div>
      </div>
    );
  }

  const currentResponse = responses[currentQId];

  const handleClearResponse = () => {
    if (currentQId) clearResponseAction(currentQId);
  };

  const mathJaxConfig = {
    loader: { load: ["[tex]/html"] },
    tex: {
      packages: { "[+]": ["html"] },
      inlineMath: [["\\(", "\\)"]],
      displayMath: [["\\[", "\\]"]],
    },
  };

  const responsesList = Object.values(responses);
  const stats = {
    total: totalQuestions,
    answered: responsesList.filter((r) => r.status === "ANSWERED").length,
    notAnswered: responsesList.filter((r) => r.status === "VISITED").length,
    notVisited: responsesList.filter((r) => r.status === "NOT_VISITED").length,
    marked: responsesList.filter((r) => r.status === "MARKED").length,
    markedAndAnswered: responsesList.filter((r) => r.status === "MARKED_AND_ANSWERED").length,
  };

  const isCurrentBookmarked = bookmarks.some(b => b.questionId === currentQId);
  const handleBookmarkToggle = async () => {
    if (!currentQId || !currentQuestion) return;
    if (isCurrentBookmarked) {
      await removeBookmark(currentQId);
    } else {
      await addBookmark(
        currentQId,
        "",
        currentQuestion.subject || "General",
        currentQuestion.topic || "General",
        undefined,
        undefined,
        sessionGoalTag ? { sourceGoalTag: sessionGoalTag } : undefined
      );
    }
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="flex flex-col h-screen w-full overflow-hidden bg-[var(--background)] font-sans">
        
        {/* REDESIGNED COMMAND BAR — a compact always-visible row (logo, Q counter, timer,
            actions) that never wraps, plus a details row (type/marks/difficulty and
            section/subject/topic) that's always shown on sm:+ but collapses behind a
            toggle on mobile instead of forcing three stacked rows. */}
        <header className="flex-none bg-[var(--surface)] border-b border-[var(--border)] shadow-sm shrink-0 z-30">
           {/* Row 1: essentials — always visible, never wraps. Both sides are shrink-0 so
               they can never squash/overlap each other on narrow screens; if content still
               can't fit, the row scrolls horizontally instead of breaking (graceful
               degradation, not silent corruption). */}
           <div className="flex items-center justify-between px-2 sm:px-5 gap-1 sm:gap-2 overflow-x-auto">
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                 <button
                   onClick={async () => {
                     if (confirm("Leave this exam? It will be paused and saved so you can resume later.")) {
                       await pauseSession();
                       router.push("/");
                     }
                   }}
                   className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-xs shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                   title="Leave exam (pauses and saves progress)"
                 >
                   G
                 </button>
                 {currentQuestion && (
                    <span className="text-[var(--text-primary)] bg-[var(--surface-secondary)] px-2 py-1 rounded-md border border-[var(--border)] font-mono text-[11px] shrink-0">
                      Q<span className="text-indigo-600 dark:text-indigo-400 font-bold">{currentQuestionIndex + 1}</span><span className="text-[var(--text-muted)] font-normal">/{totalQuestions}</span>
                    </span>
                 )}
                 {currentQuestion && (
                    <button
                      onClick={() => setShowDetails(v => !v)}
                      className="sm:hidden p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer shrink-0"
                      title={showDetails ? "Hide details" : "Show topic/marks details"}
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDetails ? "rotate-180" : ""}`} />
                    </button>
                 )}
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                 <ExamTimer compact />

                 <div className="flex items-center gap-0.5 sm:gap-1 border-l border-[var(--border)] pl-1.5 sm:pl-3 h-8 shrink-0">
                   <button
                     onClick={() => setShowMobilePalette(true)}
                     className="lg:hidden p-1 sm:p-1.5 rounded-md text-[var(--text-muted)] hover:bg-gray-100 dark:hover:bg-gray-800 transition relative"
                     title="Question Grid"
                   >
                     <LayoutGrid className="w-4 h-4" />
                     {stats.notAnswered > 0 && (
                       <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 border border-[var(--surface)]" />
                     )}
                   </button>

                   <button
                     onClick={handleBookmarkToggle}
                     className="hidden sm:inline-flex p-1 sm:p-1.5 rounded-md text-[var(--text-muted)] hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                     title="Bookmark Question"
                   >
                     {isCurrentBookmarked ? <BookmarkCheck className="w-4 h-4 text-indigo-500" /> : <Bookmark className="w-4 h-4" />}
                   </button>

                   <button
                     onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                     className="hidden sm:inline-flex p-1.5 rounded-md text-[var(--text-muted)] hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                     title="Toggle Dark Mode"
                   >
                     {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                   </button>

                   {sessionStatus === "IN_PROGRESS" ? (
                     <button
                       onClick={() => pauseSession()}
                       className="p-1.5 sm:p-2 text-amber-700 bg-amber-100 hover:bg-amber-200 dark:text-amber-400 dark:bg-amber-900/30 rounded-lg transition-colors cursor-pointer"
                       title="Pause Exam"
                     >
                       <Pause className="w-4 h-4" />
                     </button>
                   ) : (
                     <button
                       onClick={() => resumeSession()}
                       className="p-1.5 sm:p-2 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/40 rounded-lg transition-colors cursor-pointer"
                       title="Resume Exam"
                     >
                       <Play className="w-4 h-4" />
                     </button>
                   )}
                   <button
                     onClick={() => setShowSubmitModal(true)}
                     className="px-3 sm:px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg transition shadow-md cursor-pointer"
                   >
                     Submit
                   </button>
                 </div>
              </div>
           </div>

           {/* Row 2: type/marks/difficulty + section/subject/topic — collapsible on
               mobile, always visible from sm: up */}
           {currentQuestion && (
              <div className={`${showDetails ? "flex" : "hidden"} sm:flex flex-col gap-1.5 px-4 pb-2.5 sm:px-5 border-t border-[var(--border-subtle)] sm:border-t-0 pt-2 sm:pt-0`}>
                 <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-black uppercase tracking-wider">
                    <div className="flex items-center rounded-md border border-[var(--border)] overflow-hidden shrink-0 divide-x divide-[var(--border)] shadow-sm">
                      <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 py-1">
                        {currentQuestion.question_type}
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-1 font-mono normal-case">
                        +{currentQuestion.marks}/{currentQuestion.question_type === "MCQ" ? `-${(currentQuestion.marks / 3).toFixed(2)}` : "0"}
                      </span>
                      <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-1">
                        {currentQuestion.difficulty}
                      </span>
                    </div>
                 </div>
                 <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
                    <span className="bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-400 px-2 py-1 rounded inline-block" title={currentQuestion.section}>
                      {currentQuestion.section || "General"}
                    </span>
                    <span className="bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-400 px-2 py-1 rounded inline-block" title={currentQuestion.subject}>
                      {currentQuestion.subject || "General"}
                    </span>
                    <span className="bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-400 px-2 py-1 rounded inline-block" title={currentQuestion.topic}>
                      {currentQuestion.topic || "General"}
                    </span>
                 </div>
              </div>
           )}
        </header>

        {/* SECTION TABS ROW */}
        <div className="flex-none bg-[var(--surface)] border-b border-[var(--border)] z-20 w-full overflow-x-auto shadow-sm">
           <SectionTabs />
        </div>

        {/* MAIN EXAM WORKSPACE */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          
          {/* Question Workspace Component */}
          <div id="exam-workspace-container" className="flex-1 flex flex-col min-w-0 bg-[var(--surface)] h-full relative z-10 w-full lg:w-auto">
             {sessionStatus === "PAUSED" ? (
                <div className="h-full flex flex-col items-center justify-center p-8 bg-[var(--surface-secondary)]/55 backdrop-blur-sm relative z-50">
                  <h3 className="text-4xl font-extrabold text-[var(--text-primary)] mb-4 tracking-tight">
                    Session Paused
                  </h3>
                  <p className="text-[var(--text-secondary)] font-medium w-full text-center max-w-md">
                    Your timer and progress are locked. Click Resume in the top command bar to continue.
                  </p>
                  <div className="flex items-center gap-3 mt-6">
                    <button
                      onClick={() => resumeSession()}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md cursor-pointer"
                    >
                      Resume Exam
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm("Cancel this exam? Your progress so far will be discarded and this cannot be undone.")) {
                          await clearSession();
                          router.push("/");
                        }
                      }}
                      className="px-6 py-2.5 bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-elevated)] text-[var(--text-secondary)] font-bold rounded-xl transition cursor-pointer"
                    >
                      Cancel Exam
                    </button>
                  </div>
                </div>
             ) : (
                <>
                  {/* GPU Accelerated Smooth Transitions - Part 5 */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentQId}
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      transition={{ duration: 0.22, ease: "easeInOut" }}
                      style={{ willChange: "transform, opacity" }}
                      className="flex-1 overflow-hidden relative flex flex-col w-full h-full bg-[var(--surface)]"
                    >
                      {currentQuestion && currentResponse ? (
                          <QuestionRenderer
                            question={currentQuestion}
                            response={currentResponse}
                            onResponseUpdate={(payload) => {
                              if (currentQId) saveResponse(currentQId, payload);
                            }}
                            onPrev={previousQuestion}
                            onNext={nextQuestion}
                            isPrevDisabled={currentQuestionIndex === 0}
                            isNextDisabled={currentQuestionIndex === totalQuestions - 1}
                          />
                      ) : (
                        <div className="flex h-full items-center justify-center text-red-500 font-bold">
                          Question data error (ID: {currentQId})
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* BOTTOM ACTION BAR (Sticky to bottom) */}
                  <div className="flex-none px-4 py-2 sm:px-6 flex flex-col sm:flex-row justify-between items-center border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur z-20 gap-2">
                    <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          if (!currentQId) return;
                          saveResponse(currentQId, { status: (currentResponse?.selectedOptions?.length || currentResponse?.natValue) ? "MARKED_AND_ANSWERED" : "MARKED" }).then(() => {
                            if (currentQuestionIndex < totalQuestions - 1) nextQuestion();
                          });
                        }}
                        className="flex-1 sm:flex-none px-4 py-2 bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg text-sm font-bold transition shadow-sm active:scale-[0.98] cursor-pointer"
                      >
                        Mark & Next
                      </button>
                      <button
                        onClick={handleClearResponse}
                        className="flex-none px-4 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] shadow-sm hover:bg-[var(--surface-elevated)] text-[var(--text-secondary)] font-bold rounded-lg text-sm transition active:scale-[0.98] cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>

                    {/* Center: fills the gap between the two button groups with a quick glance summary */}
                    <div className="hidden md:flex items-center gap-4 text-sm font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {stats.answered}/{stats.total} solved
                      </span>
                      <span className="h-4 border-r border-[var(--border)]" />
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        {stats.marked} marked
                      </span>
                    </div>

                    <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                      <button
                        disabled={currentQuestionIndex === 0}
                        onClick={previousQuestion}
                        className="flex-1 sm:flex-none px-6 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] shadow-sm hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => {
                          if (!currentQId) {
                            nextQuestion();
                            return;
                          }
                          saveResponse(currentQId, { status: (currentResponse?.selectedOptions?.length || currentResponse?.natValue) ? "ANSWERED" : "VISITED" }).then(() => {
                            if (currentQuestionIndex < totalQuestions - 1) {
                              nextQuestion();
                            }
                          });
                        }}
                        className="flex-1 sm:flex-none px-8 py-2 bg-green-600 text-white font-extrabold tracking-wide uppercase text-sm rounded-lg hover:bg-green-700 transition shadow-md active:scale-[0.98] cursor-pointer"
                      >
                        Save & Next
                      </button>
                    </div>
                  </div>
                </>
             )}
          </div>

          {/* Right Palette — always visible as a sidebar on lg:+. On mobile it used to be
              permanently squeezed into 45vh below the question (cramped, forced scrolling,
              broke question rendering); now it's hidden by default and opened on demand via
              the grid button in the command bar, as a full bottom-sheet overlay instead. */}
          <div className="hidden lg:flex w-full lg:w-[340px] flex-none lg:border-l border-[var(--border)] bg-[var(--surface)] z-20 flex-col h-full overflow-hidden">
            <QuestionPalette />
          </div>

          <AnimatePresence>
            {showMobilePalette && (
              <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowMobilePalette(false)}
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className="relative bg-[var(--surface)] border-t border-[var(--border)] rounded-t-2xl shadow-2xl z-10 flex flex-col max-h-[75vh] overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] shrink-0">
                    <span className="text-xs font-black uppercase tracking-wider text-[var(--text-secondary)]">Question Grid</span>
                    <div className="flex items-center gap-1">
                      {/* Bookmark is hidden from the cramped row 1 on mobile — reachable here instead. */}
                      <button
                        onClick={handleBookmarkToggle}
                        className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                        title="Bookmark Question"
                      >
                        {isCurrentBookmarked ? <BookmarkCheck className="w-4 h-4 text-indigo-500" /> : <Bookmark className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setShowMobilePalette(false)}
                        className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="overflow-y-auto custom-scrollbar">
                    <QuestionPalette />
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      </div>

      <ExamSubmitDialog
        isOpen={showSubmitModal}
        stats={stats}
        onCancel={() => setShowSubmitModal(false)}
        onConfirm={async () => {
          setShowSubmitModal(false);
          await submitSession();
        }}
      />
    </MathJaxContext>
  );
}
