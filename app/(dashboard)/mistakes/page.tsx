"use client";

import { useEffect, useState, useMemo } from "react";
import { useStudyStore } from "@/store/use-study-store";
import { useDataStore } from "@/store/use-data-store";
import { QuestionRepository } from "@/lib/repository/question-repository";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { AstNodeRenderer } from "@/components/exam/ast-node-renderer";
import { MathJaxContext } from "better-react-mathjax";
import { Loader2, RefreshCw, Archive, Search, ChevronLeft, ChevronRight, StickyNote } from "lucide-react";
import { useRouter } from "next/navigation";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import { PersonalNotesDrawer } from "@/components/ui/personal-notes-drawer";
import { FullscreenNavigation } from "@/components/ui/fullscreen-navigation";

export default function MistakesPage() {
  const router = useRouter();
  const { isInitialized } = useDataStore();
  const { mistakes, loadStudyData, markMistakeMastered, removeMistake, recordMistakeReview, updateMistakeNotes } = useStudyStore();
  
  const [activeMistake, setActiveMistake] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>("ALL");
  const [showMastered, setShowMastered] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  useEffect(() => {
    loadStudyData();
  }, [loadStudyData]);

  const filteredMistakes = useMemo(() => {
    return mistakes.filter(m => {
      if (m.mastered !== showMastered) return false;
      if (filterSubject !== "ALL" && m.subject !== filterSubject) return false;
      return true;
    });
  }, [mistakes, filterSubject, showMastered]);

  const subjects = useMemo(() => {
    const subs = new Set(mistakes.map(m => m.subject));
    return Array.from(subs).sort();
  }, [mistakes]);

  const activeEntry = activeMistake ? mistakes.find(m => m.questionId === activeMistake) : null;
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
      <div className="p-12 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <MathJaxContext config={{
      loader: { load: ["[tex]/html"] },
      tex: {
        packages: { "[+]": ["html"] },
        inlineMath: [["\\(", "\\)"]],
        displayMath: [["\\[", "\\]"]],
      },
    }}>
      <div className="w-full mx-auto p-4 md:p-6 flex flex-col md:flex-row gap-6 h-[calc(100vh-80px)] relative overflow-hidden">
        {/* Sidebar */}
        <div className={`flex flex-col gap-4 overflow-hidden transition-all duration-300 shrink-0 ${isSidebarCollapsed ? "w-0 md:w-0 opacity-0 pointer-events-none" : "w-full md:w-80 opacity-100"}`}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-xl text-[var(--text-primary)]">Mistakes Bank</h2>
            </div>
            
            <div className="flex bg-[var(--surface-elevated)] p-1 rounded-lg">
              <button 
                onClick={() => setShowMastered(false)}
                className={`flex-1 text-sm py-1.5 rounded-md font-medium transition ${!showMastered ? 'bg-[var(--surface-elevated)] shadow text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                 Pending ({mistakes.filter(m => !m.mastered).length})
              </button>
              <button 
                onClick={() => setShowMastered(true)}
                className={`flex-1 text-sm py-1.5 rounded-md font-medium transition ${showMastered ? 'bg-[var(--surface-elevated)] shadow text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                 Mastered ({mistakes.filter(m => m.mastered).length})
              </button>
            </div>

            <CustomDropdown
              value={filterSubject}
              onChange={setFilterSubject}
              options={[
                { label: "All Subjects", value: "ALL" },
                ...subjects.map(s => ({ label: s, value: s }))
              ]}
              className="w-full text-sm"
            />
          </div>
          
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-y-auto flex-1 shadow-sm h-full flex flex-col">
            <div className="p-3 border-b border-[var(--border-subtle)]">
               <button
                 onClick={() => router.push("/revision?mode=mistakes")}
                 className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-300 py-2 rounded-lg font-semibold text-sm transition"
               >
                 <RefreshCw className="w-4 h-4" /> Start Revision Session
               </button>
            </div>
            {filteredMistakes.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-secondary)]">
                 No questions found in this category.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800 flex-1 overflow-y-auto">
                {filteredMistakes.map((m) => (
                  <li key={m.questionId}>
                    <button
                      onClick={() => setActiveMistake(m.questionId)}
                      className={`w-full text-left p-4 hover:hover:bg-[var(--surface-elevated)] transition-colors ${activeMistake === m.questionId ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                         <span className="font-semibold text-[var(--text-primary)] text-sm line-clamp-1">{m.subject}</span>
                         <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--surface-elevated)] px-2 py-0.5 rounded flex gap-1">Rev: {m.reviewCount}</span>
                      </div>
                      <span className="text-xs text-[var(--text-secondary)] block line-clamp-1">{m.topic}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Collapse Handle Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="hidden md:flex items-center justify-center w-6 h-12 my-auto bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text-secondary)] rounded-r-lg -ml-6 z-20 transition shadow-sm hover:text-[var(--text-primary)] cursor-pointer"
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        
        {/* Main Content Area */}
        <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
          {activeMistake && question && activeEntry ? (
            <>
              <div className="p-4 md:p-6 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row gap-4 justify-between sm:items-center bg-[var(--surface-secondary)] dark:bg-[var(--surface-secondary)]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="md:hidden p-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                    title="Toggle Sidebar"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
                  </button>
                  <div>
                     <h3 className="font-bold text-[var(--text-primary)]">Question Details</h3>
                     <span className="text-sm text-[var(--text-muted)] block mt-1">{question.subject} / {question.topic}</span>
                     <span className="text-xs text-[var(--text-muted)] mt-1 block">First seen: {new Date(activeEntry.firstSeen).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsNotesOpen(!isNotesOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-gray-100 hover:bg-[var(--surface-elevated)] border border-[var(--border)] dark:bg-gray-800 dark:hover:bg-gray-700 text-[var(--text-secondary)] rounded transition-colors"
                    title="Personal Notes"
                  >
                    <StickyNote className="w-4 h-4 text-amber-500" />
                    <span className="hidden sm:inline">Notes</span>
                    {activeEntry.notes && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                  </button>
                  {!showMastered && (
                    <button
                      onClick={async () => {
                        await markMistakeMastered(activeMistake);
                        setActiveMistake(null);
                      }}
                      className="flex items-center justify-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300 px-4 py-2 rounded-lg text-sm font-bold transition"
                    >
                      <Archive className="w-4 h-4" /> Mark Mastered
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      await removeMistake(activeMistake);
                      setActiveMistake(null);
                    }}
                    className="flex items-center justify-center gap-2 bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] px-4 py-2 rounded-lg text-sm font-semibold transition"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div id="mistakes-question-container" className="flex-1 flex flex-col min-h-0 bg-[var(--surface)] relative">
                <div className="absolute top-2 right-4 z-50">
                  <FullscreenToggle targetId="mistakes-question-container" />
                </div>
                <FullscreenNavigation
                  onPrev={handlePrev}
                  onNext={handleNext}
                  isPrevDisabled={activeIndex === 0}
                  isNextDisabled={activeIndex === filteredMistakes.length - 1}
                />
                {/* Question Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar pt-10 sm:pt-12">
                  <div className="text-lg md:text-xl font-medium leading-relaxed text-[var(--text-primary)]">
                     <AstNodeRenderer nodes={question.contentAst} />
                  </div>
                </div>

                {/* Options Fixed Area */}
                <div className="flex-none p-4 sm:p-6 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)] shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.02)] z-10 w-full">
                  <div className="w-full">
                    {(question.question_type === "MCQ" || question.question_type === "MSQ") && (
                       <div className={`grid gap-3 ${question.options.some(opt => opt.contentAst.some(n => n.type === 'image')) ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
                         {question.options.map(o => {
                            const isActuallyCorrect = o.is_correct;
                            const isUserSelected = (activeEntry.selectedOptions || []).includes(o.option_id);
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
                    {question.question_type === "NAT" && (
                       <div className="flex flex-col sm:flex-row gap-4 p-4 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-2xl w-full">
                         <div className="flex-1 flex justify-between items-center bg-[var(--surface)] p-3 border border-[var(--border-subtle)] rounded-xl">
                           <span className="text-[10px] font-black text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-widest">Correct Answer Range</span>
                           <span className="font-mono font-bold text-green-600 dark:text-green-400">
                             {question.nat_answer_range?.min} {question.nat_answer_range?.min !== question.nat_answer_range?.max && `- ${question.nat_answer_range?.max}`}
                           </span>
                         </div>
                         {activeEntry.natValue && (
                           <div className={`flex-1 flex justify-between items-center bg-[var(--surface)] p-3 border rounded-xl ${
                             parseFloat(activeEntry.natValue) >= (question.nat_answer_range?.min || 0) &&
                             parseFloat(activeEntry.natValue) <= (question.nat_answer_range?.max || 0)
                               ? 'border-green-500 text-green-700 dark:text-green-500'
                               : 'border-red-500 text-red-700 dark:text-red-500'
                           }`}>
                             <span className="text-[10px] font-black text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-widest">Your Answer</span>
                             <span className="font-mono font-bold">{activeEntry.natValue}</span>
                           </div>
                         )}
                       </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-[var(--border-subtle)]">
                    <button
                      onClick={() => recordMistakeReview(activeMistake)}
                      className="px-6 py-2 bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] font-semibold rounded-lg transition text-sm shadow-sm cursor-pointer"
                    >
                      I have reviewed this ({activeEntry.reviewCount} times)
                    </button>
                  </div>

                  <PersonalNotesDrawer
                    isOpen={isNotesOpen}
                    onClose={() => setIsNotesOpen(false)}
                    notes={activeEntry.notes || ""}
                    onNotesChange={(newNotes) => updateMistakeNotes(activeMistake, newNotes)}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center text-[var(--text-muted)]">
               <Search className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-700" />
               <p className="text-lg font-medium text-[var(--text-secondary)]">Select a mistake to review</p>
               <p className="text-sm max-w-md mt-2">Questions you mark or answer incorrectly are automatically saved here for later review.</p>
            </div>
          )}
        </div>
      </div>
    </MathJaxContext>
  );
}
