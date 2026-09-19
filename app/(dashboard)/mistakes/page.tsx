"use client";

import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStudyStore } from "@/store/use-study-store";
import { useDataStore } from "@/store/use-data-store";
import { QuestionRepository } from "@/lib/repository/question-repository";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { AstNodeRenderer } from "@/components/exam/ast-node-renderer";
import { MathJaxContext } from "better-react-mathjax";
import {
  Loader2, RefreshCw, Archive, Search, ChevronLeft, ChevronRight,
  StickyNote, AlertTriangle, Star, CheckSquare, Zap, BarChart2, Sparkles, X, Bookmark, Target
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import { PersonalNotesDrawer } from "@/components/ui/personal-notes-drawer";
import { FullscreenNavigation } from "@/components/ui/fullscreen-navigation";
import { IDBManager } from "@/lib/repository/storage/idb-manager";

export default function MistakesPage() {
  const router = useRouter();
  const { isInitialized } = useDataStore();
  const { mistakes, loadStudyData, markMistakeMastered, removeMistake, recordMistakeReview, bookmarks, addBookmark, removeBookmark } = useStudyStore();

  const [activeMistake, setActiveMistake] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>("ALL");
  const [filterTopic, setFilterTopic] = useState<string>("ALL");
  const [showMastered, setShowMastered] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Option Validation interactive state
  const [userSelected, setUserSelected] = useState<string[]>([]);
  const [userNatValue, setUserNatValue] = useState<string>("");
  const [validationOutcome, setValidationOutcome] = useState<"correct" | "incorrect" | null>(null);

  useEffect(() => {
    loadStudyData();
  }, [loadStudyData]);

  // Select first mistake automatically on load / filter change
  useEffect(() => {
    if (mistakes.length > 0 && !activeMistake) {
      const activeCandidates = mistakes.filter(m => m.mastered === showMastered);
      if (activeCandidates.length > 0) {
        setActiveMistake(activeCandidates[0].questionId);
      }
    }
  }, [mistakes, showMastered, activeMistake]);

  // Reset topic filter whenever subject changes
  useEffect(() => {
    setFilterTopic("ALL");
  }, [filterSubject]);

  // Reset validation state and options when active mistake changes
  useEffect(() => {
    setUserSelected([]);
    setUserNatValue("");
    setValidationOutcome(null);
  }, [activeMistake]);

  const activeEntry = activeMistake ? mistakes.find(m => m.questionId === activeMistake) : null;

  // Handle active entry updates directly in DB
  const handleUpdateMistakeMeta = async (qid: string, updates: Partial<typeof mistakes[0]>) => {
    const target = mistakes.find(m => m.questionId === qid);
    if (!target) return;

    // Calculate dynamic mastery score (0-100) based on retry status
    let mastery = target.mastery || 0;
    if (updates.mastered !== undefined) {
      mastery = updates.mastered ? 100 : 30;
    }

    const updated = {
      ...target,
      ...updates,
      mastery
    };
    await IDBManager.saveMistake(updated);
    await loadStudyData();
  };

  const handleToggleBookmark = async () => {
    if (!activeMistake || !question) return;
    const isBookmarked = bookmarks.some(b => b.questionId === activeMistake);
    if (isBookmarked) {
      await removeBookmark(activeMistake);
    } else {
      await addBookmark(
        activeMistake,
        "",
        question.subject,
        question.topic
      );
    }
  };

  // Solved retry handler
  const handleRetrySolve = async (isCorrect: boolean) => {
    if (!activeEntry) return;

    const retryCount = (activeEntry.retryCount || 0) + 1;
    const solvedCount = (activeEntry.solvedCount || 0) + (isCorrect ? 1 : 0);
    const occurrences = (activeEntry.occurrences || 1) + (isCorrect ? 0 : 1);

    // Mastered if solved 3 times or user chose manual mastery
    const mastered = solvedCount >= 3;

    await handleUpdateMistakeMeta(activeEntry.questionId, {
      retryCount,
      solvedCount,
      occurrences,
      mastered,
      lastSeen: new Date().toISOString(),
      revisionStatus: mastered ? 'Completed' : (occurrences > 2 ? 'Very High Priority' : 'High')
    });
  };

  // Perform option validation without revealing correct answer initially
  const handleValidateAnswer = () => {
    if (!activeEntry || !question) return;

    let isCorrect = false;

    if (question.question_type === "MCQ" || question.question_type === "MSQ") {
      const correctOptionIds = (question.options || [])
        .filter(o => o.is_correct)
        .map(o => o.option_id)
        .sort()
        .join(",");

      const userOptionIds = [...userSelected].sort().join(",");
      isCorrect = correctOptionIds === userOptionIds;
    } else if (question.question_type === "NAT" && question.nat_answer_range) {
      const val = parseFloat(userNatValue);
      isCorrect = !isNaN(val) &&
        val >= question.nat_answer_range.min &&
        val <= question.nat_answer_range.max;
    }

    if (isCorrect) {
      setValidationOutcome("correct");
      handleRetrySolve(true);
    } else {
      setValidationOutcome("incorrect");
      handleRetrySolve(false);
    }
  };

  // Toggle option helper for interactive questions
  const handleOptionToggle = (optionId: string) => {
    if (!question) return;

    if (question.question_type === "MCQ") {
      setUserSelected([optionId]);
    } else if (question.question_type === "MSQ") {
      setUserSelected(prev =>
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    }
  };

  // Unique subjects in mistakes bank
  const subjects = useMemo(() => {
    const subs = new Set(mistakes.map(m => m.subject));
    return Array.from(subs).sort();
  }, [mistakes]);

  // Unique topics filtered by active subject selection
  const topics = useMemo(() => {
    const filteredMistakesBySub = mistakes.filter(m => {
      if (m.mastered !== showMastered) return false;
      if (filterSubject !== "ALL" && m.subject !== filterSubject) return false;
      return true;
    });
    const uniq = new Set(filteredMistakesBySub.map(m => m.topic));
    return Array.from(uniq).sort();
  }, [mistakes, filterSubject, showMastered]);

  const subjectOptions = useMemo(() => {
    const list = [
      { label: "All Subjects", value: "ALL", subLabel: `Total: ${mistakes.filter(m => m.mastered === showMastered).length} mistakes` }
    ];
    subjects.forEach(s => {
      const filtered = mistakes.filter(m => m.subject === s && m.mastered === showMastered);
      const count = filtered.length;
      const occurrences = filtered.reduce((acc, m) => acc + (m.occurrences || 1), 0);
      list.push({
        label: s,
        value: s,
        subLabel: `${count} mistakes • ${occurrences} occurrences`
      });
    });
    return list;
  }, [subjects, mistakes, showMastered]);

  const topicOptions = useMemo(() => {
    const list = [
      { label: "All Topics", value: "ALL", subLabel: `Total: ${topics.length} topics` }
    ];
    topics.forEach(t => {
      const filtered = mistakes.filter(m => m.topic === t && m.mastered === showMastered);
      const count = filtered.length;
      const occurrences = filtered.reduce((acc, m) => acc + (m.occurrences || 1), 0);
      list.push({
        label: t,
        value: t,
        subLabel: `${count} mistakes • ${occurrences} occurrences`
      });
    });
    return list;
  }, [topics, mistakes, showMastered]);

  // Filtered Mistakes
  const filteredMistakes = useMemo(() => {
    return mistakes.filter(m => {
      if (m.mastered !== showMastered) return false;
      if (filterSubject !== "ALL" && m.subject !== filterSubject) return false;
      if (filterTopic !== "ALL" && m.topic !== filterTopic) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.subject.toLowerCase().includes(q) ||
          m.topic.toLowerCase().includes(q) ||
          (m.notes || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [mistakes, filterSubject, filterTopic, showMastered, searchQuery]);

  const question = activeEntry ? QuestionRepository.getQuestionById(activeEntry.questionId) : null;
  const activeIndex = filteredMistakes.findIndex(m => m.questionId === activeMistake);

  const handlePrev = activeIndex > 0 ? () => {
    setActiveMistake(filteredMistakes[activeIndex - 1].questionId);
  } : undefined;

  const handleNext = activeIndex < filteredMistakes.length - 1 ? () => {
    setActiveMistake(filteredMistakes[activeIndex + 1].questionId);
  } : undefined;

  if (!isInitialized) {
    return (
      <div className="p-12 flex justify-center h-full items-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <MathJaxContext config={{
      loader: { load: ["input/tex", "output/chtml"] },
      tex: {
        inlineMath: [["\\(", "\\)"]],
        displayMath: [["\\[", "\\]"]],
      },
    }}>
      <div className="w-full h-full flex flex-col md:flex-row gap-4 p-2 relative overflow-hidden bg-[var(--background)]">

        {/* Sidebar merged into a single card */}
        <div className={`flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden transition-all duration-300 shrink-0 h-full ${isSidebarCollapsed ? "w-0 opacity-0 pointer-events-none" : "w-full md:w-80 opacity-100"}`}>
          <div className="p-4 space-y-3 flex flex-col shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/10">
            <div className="flex justify-between items-center">
              <h2 className="font-extrabold text-lg text-[var(--text-primary)]">Mistakes Bank</h2>
              <span className="text-xs px-2 py-0.5 font-bold bg-[var(--surface-secondary)] text-[var(--text-secondary)] rounded-md">
                {filteredMistakes.length} Total
              </span>
            </div>

            <div className="flex bg-[var(--surface-elevated)] p-1 rounded-lg">
              <button
                onClick={() => {
                  setShowMastered(false);
                  setActiveMistake(null);
                }}
                className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition uppercase tracking-wider ${!showMastered ? 'bg-[var(--surface)] shadow text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                Pending ({mistakes.filter(m => !m.mastered).length})
              </button>
              <button
                onClick={() => {
                  setShowMastered(true);
                  setActiveMistake(null);
                }}
                className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition uppercase tracking-wider ${showMastered ? 'bg-[var(--surface)] shadow text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                Mastered ({mistakes.filter(m => m.mastered).length})
              </button>
            </div>

            {/* Compact Sidebar Search Bar */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Compact Custom Dropdowns with Occurrence Indicators */}
            <div className="space-y-2 pt-1">
              <CustomDropdown
                value={filterSubject}
                onChange={setFilterSubject}
                options={subjectOptions}
                placeholder="Subject"
                className="text-xs w-full font-semibold"
              />

              <CustomDropdown
                value={filterTopic}
                onChange={setFilterTopic}
                options={topicOptions}
                placeholder="Topic"
                className="text-xs w-full font-semibold"
              />
            </div>
          </div>

          {/* Half-Size Compact Questions list scrollbox */}
          <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            {filteredMistakes.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-secondary)] font-bold">
                No mistakes found.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredMistakes.map((m, idx) => {
                  const isCurrent = activeMistake === m.questionId;
                  const repeatCount = m.occurrences || 1;

                  return (
                    <motion.li
                      key={m.questionId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(idx * 0.03, 0.4), duration: 0.2 }}
                    >
                      <button
                        onClick={() => setActiveMistake(m.questionId)}
                        className={`w-full text-left px-4 py-2.5 hover:bg-[var(--surface-elevated)] transition-all duration-200 border-l-4 ${isCurrent
                            ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-500'
                            : 'border-transparent hover:border-indigo-500/30'
                          }`}
                      >
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-extrabold text-[var(--text-primary)] text-xs truncate">{m.subject}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black shrink-0 ${repeatCount > 2
                              ? "bg-red-500/15 text-red-500"
                              : "bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                            }`}>
                            {repeatCount} Err
                          </span>
                        </div>
                        <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1 truncate font-medium mt-0.5">
                          {m.sourceGoalTag && (
                            <Target
                              className="w-2.5 h-2.5 text-indigo-500 shrink-0"
                              aria-label={`From a Focus Target ${m.sourceGoalTag.targetPercent}% goal test`}
                            />
                          )}
                          <span className="truncate">{m.topic}</span>
                        </span>
                      </button>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Collapse Handle Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`hidden md:flex items-center justify-center w-6 h-12 my-auto bg-[var(--surface)] hover:bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] z-20 transition shadow-sm cursor-pointer shrink-0 ${
            isSidebarCollapsed ? "ml-0 rounded-r-lg border-l-0" : "-ml-3 rounded-full"
          }`}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Main Content Area */}
        <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm flex flex-col h-full overflow-hidden min-w-0">
          {activeMistake && question && activeEntry ? (
            <>
              {/* Header bar */}
              <div className="p-4 md:p-6 border-b border-[var(--border-subtle)] flex flex-wrap justify-between items-center bg-[var(--surface-secondary)] dark:bg-[var(--surface-secondary)] gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="md:hidden p-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                    title="Toggle Sidebar"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
                  </button>
                  <div>
                    <h3 className="font-extrabold text-[var(--text-primary)] text-sm tracking-tight">Mistake Review</h3>
                    <span className="text-[11px] text-[var(--text-muted)] font-semibold block">{question.subject} • {question.topic}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Bookmark Toggle */}
                  <button
                    onClick={handleToggleBookmark}
                    className={`p-2 border rounded-lg transition cursor-pointer hover:bg-[var(--surface-secondary)] hover:border-[var(--border-strong)] ${
                      bookmarks.some(b => b.questionId === activeMistake)
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20" 
                        : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-amber-500"
                    }`}
                    title={bookmarks.some(b => b.questionId === activeMistake) ? "Remove Bookmark" : "Bookmark Question"}
                  >
                    <Bookmark className={`w-4 h-4 ${bookmarks.some(b => b.questionId === activeMistake) ? "fill-amber-500" : ""}`} />
                  </button>

                  <button
                    onClick={() => router.push(`/ai-tutor?qid=${activeMistake}`)}
                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition cursor-pointer flex items-center justify-center shrink-0"
                    title="Explain with AI Tutor"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      const nextVal = !isNotesOpen;
                      setIsNotesOpen(nextVal);
                      if (nextVal) {
                        setIsSidebarCollapsed(true);
                      }
                    }}
                    className={`relative p-2 border rounded-lg transition cursor-pointer flex items-center justify-center shrink-0 ${
                      isNotesOpen
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20"
                        : "bg-[var(--surface-elevated)] hover:bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                    }`}
                    title="Personal Notes"
                  >
                    <StickyNote className="w-4 h-4 text-amber-500" />
                    {activeEntry.notes && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-[var(--surface)] animate-pulse" />
                    )}
                  </button>

                  <button
                    onClick={async () => {
                      if (confirm("Remove this mistake from history?")) {
                        await removeMistake(activeMistake);
                        setActiveMistake(null);
                      }
                    }}
                    className="p-2 border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-lg transition cursor-pointer flex items-center justify-center shrink-0"
                    title="Remove from Mistakes"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Workspace viewport */}
              <div id="mistake-workspace-container" className="flex-1 flex flex-col min-h-0 bg-[var(--surface)] relative">
                <div className="absolute top-4 right-4 z-50">
                  <FullscreenToggle targetId="mistake-workspace-container" />
                </div>
                <FullscreenNavigation
                  onPrev={handlePrev}
                  onNext={handleNext}
                  isPrevDisabled={activeIndex === 0}
                  isNextDisabled={activeIndex === filteredMistakes.length - 1}
                />

                {/* Question Scrollable Area */}
                <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-12 custom-scrollbar pt-12 sm:pt-14">
                  <div className="text-lg md:text-xl font-medium leading-relaxed text-[var(--text-primary)] mb-8">
                    <AstNodeRenderer nodes={question.contentAst} />
                  </div>
                </div>

                {/* Options / NAT input - Option Validation View */}
                <div className="flex-none p-4 sm:p-6 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.02)] z-10 w-full">
                  <div className="w-full">
                    {(question.question_type === "MCQ" || question.question_type === "MSQ") && (
                      <div className={`grid gap-3 ${question.options.some(opt => opt.contentAst.some(n => n.type === 'image')) ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
                        {question.options.map(o => {
                          const isSelected = userSelected.includes(o.option_id);
                          const wasIncorrect = (activeEntry.selectedOptions || []).includes(o.option_id);

                          let borderClass = "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] cursor-pointer";
                          if (isSelected) {
                            borderClass = "border-indigo-500 bg-indigo-50/15 dark:bg-indigo-900/10 ring-1 ring-indigo-500 cursor-pointer";
                          } else if (wasIncorrect) {
                            borderClass = "border-rose-500/60 border-dashed bg-rose-500/5 cursor-pointer";
                          }

                          return (
                            <div
                              key={o.option_id}
                              onClick={() => handleOptionToggle(o.option_id)}
                              className={`p-4 border-[2px] rounded-xl transition ${borderClass} overflow-hidden`}
                            >
                              <div className="flex items-start gap-3 w-full">
                                <div className="shrink-0 font-black text-inherit w-5 mt-0.5 flex flex-col items-center">
                                  <span>{o.option_id}.</span>
                                </div>
                                <div className="text-[var(--text-primary)] max-w-full overflow-hidden break-words flex-1">
                                  <AstNodeRenderer nodes={o.contentAst} />
                                </div>
                                {wasIncorrect && (
                                  <span className="text-[8px] font-black uppercase bg-rose-500 text-white px-1.5 py-0.5 rounded tracking-wider shrink-0 mt-0.5">
                                    Prev Wrong
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {question.question_type === "NAT" && (
                      <div className="flex flex-col gap-3 p-4 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-2xl w-full">
                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                          <input
                            type="text"
                            placeholder="Enter Numerical Answer"
                            value={userNatValue}
                            onChange={(e) => setUserNatValue(e.target.value)}
                            className="flex-1 w-full bg-[var(--surface)] border border-[var(--border)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold font-mono"
                          />
                          {activeEntry.natValue && (
                            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 px-3.5 py-3 rounded-xl text-xs font-bold shrink-0 font-mono">
                              Previously incorrect choice: {activeEntry.natValue}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Bar: Moves Stats and Check answer action blocks */}
                <div className="flex-none p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)] z-10 w-full flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
                  {/* Stats badges */}
                  <div className="flex items-center gap-3">
                    <div className="bg-[var(--surface)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-xl text-center min-w-[80px]">
                      <span className="block text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Occurrences</span>
                      <span className="text-xs font-black text-rose-500 font-mono">{activeEntry.occurrences || 1}</span>
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-xl text-center min-w-[80px]">
                      <span className="block text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Solved Retries</span>
                      <span className="text-xs font-black text-emerald-500 font-mono">{activeEntry.solvedCount || 0} / {activeEntry.retryCount || 0}</span>
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-xl text-center min-w-[80px]">
                      <span className="block text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Mastery</span>
                      <span className="text-xs font-black text-indigo-500 font-mono">{activeEntry.mastery || 0}%</span>
                    </div>
                  </div>

                  {/* Validate solution & mastery triggers */}
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <AnimatePresence mode="wait">
                      {validationOutcome !== null && (
                        <motion.span
                          key={validationOutcome}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          className={`text-xs font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl border ${validationOutcome === "correct"
                              ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                              : "bg-red-500/10 border-red-500/20 text-rose-600 dark:text-rose-400"
                            }`}>
                          {validationOutcome === "correct" ? "✓ Correct Answer!" : "✗ Incorrect retry"}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={handleValidateAnswer}
                      className="px-6 py-2.5 text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-md shadow-indigo-600/10 cursor-pointer"
                    >
                      Validate Answer
                    </motion.button>

                    {activeEntry.mastered ? (
                      <span className="text-xs font-extrabold uppercase tracking-wider px-3 py-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-lg border border-emerald-200/50">
                        Mastered
                      </span>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleUpdateMistakeMeta(activeMistake, { mastered: true })}
                        className="px-4 py-2 text-xs font-extrabold uppercase tracking-wider bg-[var(--surface-elevated)] hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-lg transition cursor-pointer"
                      >
                        Mark Mastered
                      </motion.button>
                    )}
                  </div>
                </div>

              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-[var(--text-secondary)]"
            >
              <AlertTriangle className="w-12 h-12 text-[var(--text-muted)] mb-4" />
              <h3 className="font-bold text-lg text-[var(--text-primary)] mb-1">No mistake selected</h3>
              <p className="text-sm text-[var(--text-muted)] text-center max-w-sm">Select a recorded mistake from the sidebar to test your retry progress or manually master the question.</p>
            </motion.div>
          )}
        </div>

        {/* Inline Curved Notes Panel */}
        <AnimatePresence>
        {isNotesOpen && activeMistake && activeEntry && (
          <motion.div
            initial={{ opacity: 0, x: 24, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 320 }}
            exit={{ opacity: 0, x: 24, width: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 32 }}
            className="h-full flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm shrink-0 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--surface-secondary)]">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-wider text-xs">
                <StickyNote className="w-4 h-4" />
                <span>Personal Notes</span>
              </div>
              <button
                onClick={() => setIsNotesOpen(false)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 flex flex-col gap-3">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-extrabold">
                Add formulas, shortcuts, hints, or personal notes to this question.
              </p>
              <textarea
                value={activeEntry.notes || ""}
                onChange={async (e) => {
                  const notes = e.target.value;
                  const { updateMistakeNotes } = useStudyStore.getState();
                  await updateMistakeNotes(activeMistake, notes);
                }}
                placeholder="Write your note here... (Changes are saved automatically)"
                className="w-full flex-1 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]/50 text-[var(--text-primary)] focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none text-xs font-semibold leading-relaxed"
              />
            </div>

            {/* Footer */}
            <button
              onClick={() => setIsNotesOpen(false)}
              className="p-4 border-t border-[var(--border-subtle)] text-center bg-[var(--surface-secondary)] hover:bg-[var(--surface-elevated)] transition-colors text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-black uppercase tracking-wider cursor-pointer w-full"
            >
              Save & Close Note
            </button>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </MathJaxContext>
  );
}
