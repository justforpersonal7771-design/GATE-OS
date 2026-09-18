"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useStudyStore } from "@/store/use-study-store";
import { QuestionRepository } from "@/lib/repository/question-repository";
import { AIService } from "@/lib/ai/AIService";
import { PracticeGenerator } from "@/lib/ai/practice-generator";
import { AstNodeRenderer } from "@/components/exam/ast-node-renderer";
import { MathJaxContext } from "better-react-mathjax";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import {
  Sparkles, Loader2, Send, Bookmark, Star, ArrowLeft, ArrowRight,
  BookOpen, Lightbulb, Zap, HelpCircle, FileText, ChevronDown, ChevronUp,
  Download, Printer, Plus, CheckCircle, BrainCircuit, MessageSquare, ClipboardCheck, Trash2, AlertTriangle
} from "lucide-react";
import { IDBManager } from "@/lib/repository/storage/idb-manager";
import { AIPracticeQuestion, AIExplanation } from "@/types/ai.types";
import { AIResponseParser } from "@/lib/ai/ai-response-parser";
import { ConversationMemory } from "@/lib/ai/memory/ConversationMemory";
import { useToastStore } from "@/store/use-toast-store";

const EXPLAIN_MODES = [
  "Detailed",
  "Simple",
  "Exam Oriented",
  "Mathematical",
  "Visual",
  "Algorithmic",
  "Pseudo Code",
  "Step-by-Step",
  "Beginner",
  "Advanced"
] as const;

const PERSONALITIES = [
  "Mentor",
  "Teacher",
  "Examiner",
  "Interviewer",
  "Motivator",
  "Fast Solver",
  "Concept Builder",
  "Revision Coach"
] as const;

export default function AITutorWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { bookmarks, mistakes, loadStudyData } = useStudyStore();
  const qid = searchParams.get("qid") || "";

  const [mounted, setMounted] = useState(false);
  const [question, setQuestion] = useState<any>(null);
  const [explainMode, setExplainMode] = useState<string>("Detailed");
  const [personality, setPersonality] = useState<string>("Mentor");
  const [activeBookmarkEntry, setActiveBookmarkEntry] = useState<any>(null);
  const [isShortcutBookmarked, setIsShortcutBookmarked] = useState(false);

  // AI Response states
  const [explanation, setExplanation] = useState<AIExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Conversational follow-up history
  const [history, setHistory] = useState<{ role: "user" | "model"; text: string; data?: AIExplanation }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [restoredQid, setRestoredQid] = useState<string | null>(null);
  const skipAutoFetchRef = useRef(false);

  // Cards layout states (collapsing/pinning)
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    overview: true,
    steps: true,
    shortcut: true,
    formulas: true,
    mistakes: true
  });
  const [pinnedCards, setPinnedCards] = useState<Record<string, boolean>>({});

  // Right panel custom assets
  const [practiceQuestions, setPracticeQuestions] = useState<AIPracticeQuestion[]>([]);
  const [generatingPractice, setGeneratingPractice] = useState(false);
  const [personalNotes, setPersonalNotes] = useState("");
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [isOutlineCollapsed, setIsOutlineCollapsed] = useState(false);
  const [expandedPracticeId, setExpandedPracticeId] = useState<number | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  const handleAutoNotes = async () => {
    if (!qid) return;
    setGeneratingNotes(true);
    try {
      const res = await AIService.chatFollowUp(
        qid,
        [],
        "Based on this question's concept, generate standard personal summary study notes. Keep it to a few concise bullet points outlining the core formula, main concept, and key trick. Do not output markdown headers or json. Just plain text.",
        true
      );
      if (res.success && res.data) {
        const notes = res.data.concept + "\n\n" + res.data.steps.join("\n");
        setPersonalNotes(notes);
      } else {
        useToastStore.getState().show("Failed to auto-generate notes.", "error");
      }
    } catch {
      useToastStore.getState().show("Failed to auto-generate notes.", "error");
    } finally {
      setGeneratingNotes(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    QuestionRepository.initialize().then(() => {
      if (qid) {
        const q = QuestionRepository.getQuestionById(qid);
        setQuestion(q);
      }
    });
    loadStudyData();
  }, [qid, loadStudyData]);

  // Load bookmark entry mapping if it exists
  useEffect(() => {
    if (qid && bookmarks.length > 0) {
      const entry = bookmarks.find(b => b.questionId === qid);
      setActiveBookmarkEntry(entry || null);
      if (entry) {
        setPersonalNotes(entry.personalObservations || entry.notes || "");
        setIsShortcutBookmarked(entry.isShortcutOnly === true || !!entry.aiShortcut);
        if (entry.aiPracticeQuestions) {
          try {
            setPracticeQuestions(JSON.parse(entry.aiPracticeQuestions));
          } catch { }
        }
      } else {
        setIsShortcutBookmarked(false);
      }
    } else {
      setIsShortcutBookmarked(false);
    }
  }, [qid, bookmarks]);

  // Restore any previously saved conversation for this question before deciding
  // whether to auto-generate a fresh explanation.
  useEffect(() => {
    if (!qid) return;
    let active = true;

    (async () => {
      const saved = await ConversationMemory.getConversation(qid);
      if (!active) return;

      if (saved.length > 0) {
        setHistory(saved.map(({ role, text, data }) => ({ role, text, data: data as AIExplanation | undefined })));
        const lastModelWithData = [...saved].reverse().find(m => m.role === "model" && m.data);
        if (lastModelWithData?.data) {
          setExplanation(lastModelWithData.data as AIExplanation);
        }
        skipAutoFetchRef.current = true;
      } else {
        setHistory([]);
        setExplanation(null);
      }
      setRestoredQid(qid);
    })();

    return () => {
      active = false;
    };
  }, [qid]);

  // Persist conversation history for this question whenever it changes.
  useEffect(() => {
    if (!qid || history.length === 0) return;
    ConversationMemory.saveConversation(
      qid,
      history.map(h => ({ role: h.role, text: h.text, data: h.data }))
    );
  }, [qid, history]);

  // Fetch initial AI explanation whenever learning mode or personality changes
  useEffect(() => {
    if (!qid || restoredQid !== qid) return; // wait for the restore attempt above to finish first

    if (skipAutoFetchRef.current) {
      skipAutoFetchRef.current = false;
      return;
    }

    let active = true;

    const fetchExplanation = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await AIService.explainQuestion(qid, undefined, explainMode, personality, false);
        if (!active) return;

        if (res.success && res.data) {
          setError(null);
          setExplanation(res.data);
          // Set initial explanation card in conversation history
          setHistory([{
            role: "model",
            text: `Conceptual overview for dynamic mode is initialized.`,
            data: res.data
          }]);

          // Save interaction in persistent LearningMemory log. This is an AI
          // consultation, not a graded attempt — only record real, known data
          // (e.g. from an existing mistake record for this question), never
          // fabricate isCorrect/timeSpent/confidence values.
          try {
            const { LearningMemory } = await import("@/lib/ai/memory/LearningMemory");
            const priorMistake = mistakes.find(m => m.questionId === qid);
            await LearningMemory.recordInteraction({
              questionId: qid,
              topic: question?.topic || "Unknown",
              subject: question?.subject || "Unknown",
              difficulty: question?.difficulty || "Medium",
              interactionType: "consultation",
              isCorrect: priorMistake ? false : undefined,
              confidenceBefore: priorMistake?.confidence,
              practiceGenerated: false
            });
          } catch (e) {
            console.warn("Failed to record learning interaction:", e);
          }
        } else {
          if (res.error !== "Request aborted") {
            setError(res.error || "Failed to generate conceptual overview.");
          }
        }
      } catch (err: any) {
        if (!active) return;
        if (err.message !== "Request aborted") {
          setError(err.message || "An error occurred.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchExplanation();

    return () => {
      active = false;
      AIService.cancelRequest(`explain_${qid}_${explainMode}_${personality}`);
    };
  }, [qid, explainMode, personality, question, restoredQid]);

  // Scroll to chat bottom whenever history updates
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, chatLoading]);

  // Switch bookmark state
  const handleToggleBookmark = async () => {
    if (!question) return;
    const isBookmarked = !!activeBookmarkEntry;
    if (isBookmarked) {
      await useStudyStore.getState().removeBookmark(qid);
      setActiveBookmarkEntry(null);
    } else {
      await useStudyStore.getState().addBookmark(
        qid,
        personalNotes,
        question.subject,
        question.topic
      );
    }
    await loadStudyData();
  };

  // Save notes locally to IndexedDB bookmark record
  const handleSaveNotes = async () => {
    if (!question) return;
    if (!activeBookmarkEntry) {
      // Auto-create bookmark to store notes
      await useStudyStore.getState().addBookmark(
        qid,
        personalNotes,
        question.subject,
        question.topic,
        undefined,
        undefined,
        {
          personalObservations: personalNotes,
          aiPracticeQuestions: JSON.stringify(practiceQuestions),
          aiExplanation: explanation?.concept,
          aiShortcut: explanation?.shortcut,
          aiFormula: JSON.stringify(explanation?.formulas || [])
        }
      );
    } else {
      const updated = {
        ...activeBookmarkEntry,
        notes: personalNotes,
        personalObservations: personalNotes,
        aiPracticeQuestions: JSON.stringify(practiceQuestions),
        aiExplanation: explanation?.concept,
        aiShortcut: explanation?.shortcut,
        aiFormula: JSON.stringify(explanation?.formulas || [])
      };
      await IDBManager.saveBookmark(updated);
      await loadStudyData();
    }
    useToastStore.getState().show("Notes successfully saved to local workspace!");
  };

  const handleSaveShortcut = async () => {
    if (!question || !explanation || !explanation.shortcut) return;
    await useStudyStore.getState().addBookmark(
      qid,
      "",
      question.subject,
      question.topic,
      undefined,
      undefined,
      {
        isShortcutOnly: true,
        aiShortcut: explanation.shortcut
      }
    );
    setIsShortcutBookmarked(true);
    useToastStore.getState().show("Shortcut trick saved to your Library!");
  };

  const scrollToCard = (cardKey: string) => {
    // Make sure the target card is expanded
    setExpandedCards(prev => ({ ...prev, [cardKey]: true }));
    
    // Smooth scroll to container element
    setTimeout(() => {
      const el = document.getElementById(`card-${cardKey}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  // Submit follow-up message to Gemini
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading || !qid) return;

    const userMsg = chatInput.trim();
    setHistory(prev => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setChatLoading(true);

    try {
      // Re-map messages to prompt-friendly formats
      const conversationHistory = history.map(h => ({
        role: h.role,
        text: h.text + (h.data ? `\nData: ${JSON.stringify(h.data)}` : "")
      }));

      const res = await AIService.chatFollowUp(qid, conversationHistory, userMsg, false);
      if (res.success && res.data) {
        setHistory(prev => [...prev, { role: "model", text: "Answer generated", data: res.data }]);
      } else {
        setHistory(prev => [...prev, { role: "model", text: `Error: ${res.error || "Failed to generate follow-up answer."}` }]);
      }
    } catch (err: any) {
      setHistory(prev => [...prev, { role: "model", text: `Error: ${err.message || "Failed to establish connection."}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Generate 8 diverse practice questions via Gemini and save them to separate category
  const handleGeneratePractice = async () => {
    if (!question) return;
    setGeneratingPractice(true);
    try {
      const set = await PracticeGenerator.generateDiversePracticeSet(question.topic, false, question);
      setPracticeQuestions(set);

      // Save each question to IndexedDB and register dynamically in repository
      for (let idx = 0; idx < set.length; idx++) {
        const pq = set[idx];
        const qId = `ai_${Date.now()}_${idx}`;

        const correctIds = new Set(pq.correctOptionIds || []);
        if (pq.questionType !== "NAT" && correctIds.size === 0) {
          console.warn(`AI-generated question ${idx} is missing correctOptionIds; no option will be marked correct.`);
        }
        const compiledOptions = pq.options?.map(o => ({
          option_id: o.option_id,
          is_correct: correctIds.has(o.option_id),
          optionTextRaw: o.content,
          contentAst: [{ type: "text" as const, content: o.content }]
        })) || [];

        const renderableQ = {
          question_no: idx + 1,
          question_id: qId,
          question_type: pq.questionType || "MCQ",
          marks: pq.questionType === "NAT" ? 2 : 1,
          section: "AI Generated",
          subject: question.subject,
          topic: question.topic,
          difficulty: pq.difficulty === "Medium" ? "Moderate" : pq.difficulty as any,
          year: "AI",
          shift: "Gen",
          year_shift: "AI Generated",
          questionTextRaw: pq.questionText,
          contentAst: [{ type: "text" as const, content: pq.questionText }],
          options: compiledOptions,
          nat_answer_range: pq.natAnswerRange,
          isAiGenerated: true,
          has_image: false,
          requires_latex: pq.questionText.includes("\\(") || pq.questionText.includes("\\[")
        };

        // Save to IndexedDB
        await IDBManager.saveAIGeneratedQuestion(renderableQ);

        // Register in active QuestionRepository mapping
        QuestionRepository.registerDynamicQuestion(renderableQ);
      }

      setExpandedPracticeId(0);
    } catch (err) {
      console.warn("Failed generating practice set", err);
    } finally {
      setGeneratingPractice(false);
    }
  };

  // Export current session workspace sheets
  const handleExportText = (format: "TXT" | "MD") => {
    if (!question) return;

    let content = "";
    if (format === "MD") {
      content += `# AI Tutor Session - ${question.subject}\n`;
      content += `**Topic:** ${question.topic}\n`;
      content += `**Question:** ${question.question_text || "Custom Question"}\n\n`;
      content += `## Learning Conversation History\n\n`;

      history.forEach((h, idx) => {
        content += `### ${h.role === "user" ? "Student" : "Tutor"} (Message #${idx + 1})\n`;
        content += `${h.text}\n\n`;
        if (h.data) {
          content += `#### Concept\n${h.data.concept}\n\n`;
          content += `#### Steps\n${h.data.steps.map(s => `- ${s}`).join("\n")}\n\n`;
          if (h.data.shortcut) {
            content += `#### Shortcut\n${h.data.shortcut}\n\n`;
          }
        }
      });
    } else {
      content += `AI Tutor Session - ${question.subject}\n`;
      content += `Topic: ${question.topic}\n\n`;
      history.forEach((h, idx) => {
        content += `${h.role === "user" ? "Student" : "Tutor"}:\n${h.text}\n`;
        if (h.data) {
          content += `Concept: ${h.data.concept}\n`;
          content += `Steps:\n${h.data.steps.join("\n")}\n`;
        }
        content += `----------------------------------------\n`;
      });
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ai-session-${qid}.${format === "MD" ? "md" : "txt"}`;
    link.click();
  };

  if (!mounted) return null;

  return (
    <MathJaxContext config={{
      loader: { load: ["input/tex", "output/chtml"] },
      tex: {
        inlineMath: [["\\(", "\\)"]],
        displayMath: [["\\[", "\\]"]],
      },
    }}>
      <div className="w-full h-full flex flex-col overflow-hidden bg-[var(--background)]">

        {/* Sticky Command Bar */}
        <header className="flex-none bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3 sticky top-0 z-50 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 hover:bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-secondary)] transition"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 bg-indigo-500/10 text-indigo-500 font-extrabold rounded-lg uppercase tracking-wider">
                AI Tutor
              </span>
              {question && (
                <span className="text-[11px] text-[var(--text-muted)] font-bold hidden sm:inline">
                  {question.subject} • {question.topic}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Explain Mode selector */}
            <CustomDropdown
              value={explainMode}
              onChange={setExplainMode}
              options={EXPLAIN_MODES.map(m => ({ label: `${m} Format`, value: m }))}
              className="w-40 text-xs font-bold"
            />

            {/* Coach Personality selector */}
            <CustomDropdown
              value={personality}
              onChange={setPersonality}
              options={PERSONALITIES.map(p => ({ label: `Coach: ${p}`, value: p }))}
              className="w-40 text-xs font-bold"
            />

            {/* Bookmark button */}
            <button
              onClick={handleToggleBookmark}
              className={`p-2 border rounded-lg transition flex items-center gap-1.5 text-xs font-black uppercase tracking-wider ${activeBookmarkEntry
                ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-amber-500"
                }`}
            >
              <Bookmark className={`w-4 h-4 ${activeBookmarkEntry ? "fill-amber-500" : ""}`} />
              <span>{activeBookmarkEntry ? "Bookmarked" : "Bookmark"}</span>
            </button>

            {/* Save Shortcut button */}
            {explanation?.shortcut && (
              <button
                onClick={handleSaveShortcut}
                className={`p-2 border rounded-lg transition flex items-center gap-1.5 text-xs font-black uppercase tracking-wider ${isShortcutBookmarked
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-emerald-500"
                  }`}
              >
                <Zap className={`w-4 h-4 ${isShortcutBookmarked ? "fill-emerald-500 text-emerald-500" : ""}`} />
                <span>{isShortcutBookmarked ? "Shortcut Saved" : "Save Shortcut"}</span>
              </button>
            )}

            {/* Export Menu */}
            <button
              onClick={() => handleExportText("MD")}
              className="p-2 bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] rounded-lg transition text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
              title="Export Markdown Sheet"
            >
              <Download className="w-4 h-4" /> Export
            </button>

            <button
              onClick={() => window.print()}
              className="p-2 bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] rounded-lg transition text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
              title="Print Session"
            >
              <Printer className="w-4 h-4" /></button>

            <button
              onClick={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
              className="p-2 bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] rounded-lg transition text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
              title="Toggle Sidebar"
            >
              <span>{isRightPanelCollapsed ? "Show" : "Hide"}</span>
            </button>
          </div>
        </header>

        {/* Workspace Body: 3-Column Layout */}
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">

          {/* LEFT PANEL: Question Details */}
          <section className={`w-full border-r border-[var(--border)] bg-[var(--surface)] flex flex-col h-full overflow-hidden shrink-0 transition-all duration-300 ${isRightPanelCollapsed ? "lg:w-[50%]" : "lg:w-96"
            }`}>
            {question ? (
              <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">

                {/* Meta details */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Question details</span>
                    <span className={`text-[10px] px-2 py-0.5 font-bold uppercase rounded-md ${question.difficulty === "Hard"
                      ? "bg-rose-500/10 text-rose-500"
                      : question.difficulty === "Medium"
                        ? "bg-amber-500/10 text-amber-500"
                        : "bg-emerald-500/10 text-emerald-500"
                      }`}>
                      {question.difficulty}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-[var(--text-primary)] leading-snug">
                    {question.subject}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">
                    Topic: {question.topic}
                  </p>
                </div>

                {/* Question content AST */}
                <div className="p-4 bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] rounded-xl leading-relaxed text-sm text-[var(--text-primary)] max-h-96 overflow-y-auto custom-scrollbar">
                  <AstNodeRenderer nodes={question.contentAst} />
                </div>

                {/* Options List */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block">Options</span>
                  {(question.question_type === "MCQ" || question.question_type === "MSQ") && question.options && (
                    <div className="space-y-2">
                      {question.options.map((o: any) => {
                        const isCorrect = o.is_correct;
                        return (
                          <div
                            key={o.option_id}
                            className={`p-3 border rounded-xl flex items-start gap-2.5 text-xs font-semibold ${isCorrect
                              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                              : "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-secondary)]"
                              }`}
                          >
                            <span className="font-extrabold shrink-0">{o.option_id}.</span>
                            <div className="overflow-hidden break-words"><AstNodeRenderer nodes={o.contentAst} /></div>
                            {isCorrect && <CheckCircle className="w-3.5 h-3.5 ml-auto text-emerald-500 shrink-0 mt-0.5" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {question.question_type === "NAT" && question.nat_answer_range && (
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold font-mono flex justify-between items-center">
                      <span>Correct Answer Range</span>
                      <span>{question.nat_answer_range.min} - {question.nat_answer_range.max}</span>
                    </div>
                  )}
                </div>

                {/* Historical Attempt summary metrics */}
                <div className="p-4 bg-[var(--surface-secondary)]/30 border border-[var(--border-subtle)] rounded-xl space-y-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block">Tutor Diagnostic logs</span>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-[var(--surface)] border border-[var(--border-subtle)] p-2 rounded-lg">
                      <span className="block text-[8px] font-black uppercase text-[var(--text-muted)]">Attempts</span>
                      <span className="text-xs font-bold text-[var(--text-primary)]">3 times</span>
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border-subtle)] p-2 rounded-lg">
                      <span className="block text-[8px] font-black uppercase text-[var(--text-muted)]">Revision Pri.</span>
                      <span className="text-xs font-bold text-rose-500">Very High</span>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-[var(--text-muted)]">
                No active question loaded.
              </div>
            )}
          </section>

          {/* CENTER PANEL: Chat & Scrollable AI Cards (Width Flex-1) */}
          <section className="flex-1 bg-[var(--surface-secondary)]/20 flex flex-col h-full overflow-hidden relative min-w-0">

            {/* Scrollable list of cards & message history */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">

              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Compiling contextual AI response...</span>
                </div>
              ) : error ? (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : (
                <div className="space-y-8 max-w-3xl mx-auto">
                  {history.map((msg, msgIdx) => {
                    const isModel = msg.role === "model";
                    const data = msg.data;

                    if (!isModel) {
                      return (
                        <motion.div
                          key={msgIdx}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex justify-end"
                        >
                          <div className="bg-indigo-600 text-white rounded-2xl px-4 py-2.5 text-xs font-bold max-w-md shadow-sm">
                            {msg.text}
                          </div>
                        </motion.div>
                      );
                    }

                    if (!data) {
                      return (
                        <motion.div
                          key={msgIdx}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex justify-start"
                        >
                          <div className="bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] rounded-2xl px-4 py-2.5 text-xs font-medium max-w-md shadow-sm">
                            {msg.text}
                          </div>
                        </motion.div>
                      );
                    }

                    // Render dynamic Collapsible Cards
                    return (
                      <motion.div
                        key={msgIdx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-4"
                      >

                     {/* 1. OVERVIEW CARD */}
                        <div id="card-overview" className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                          <button
                            onClick={() => setExpandedCards(prev => ({ ...prev, overview: !prev.overview }))}
                            className="w-full flex justify-between items-center px-4 py-3 bg-[var(--surface-secondary)]/30 border-b border-[var(--border-subtle)] text-left"
                          >
                            <span className="text-xs font-extrabold uppercase text-[var(--text-primary)] tracking-wider flex items-center gap-1.5">
                              <BrainCircuit className="w-4 h-4 text-indigo-500" />
                              1. Concept Overview
                            </span>
                            {expandedCards.overview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <AnimatePresence initial={false}>
                            {expandedCards.overview && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 text-xs text-[var(--text-secondary)] font-semibold leading-relaxed">
                                  <AstNodeRenderer nodes={AIResponseParser.parse(data.concept)} />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* 2. STEP BY STEP SOLUTION */}
                        {data.steps && data.steps.length > 0 && (
                          <div id="card-steps" className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                            <button
                              onClick={() => setExpandedCards(prev => ({ ...prev, steps: !prev.steps }))}
                              className="w-full flex justify-between items-center px-4 py-3 bg-[var(--surface-secondary)]/30 border-b border-[var(--border-subtle)] text-left"
                            >
                              <span className="text-xs font-extrabold uppercase text-[var(--text-primary)] tracking-wider flex items-center gap-1.5">
                                <BookOpen className="w-4 h-4 text-emerald-500" />
                                2. Step-by-Step Proof & Solution
                              </span>
                              {expandedCards.steps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            <AnimatePresence initial={false}>
                              {expandedCards.steps && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2, ease: "easeInOut" }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-4 space-y-3">
                                    {data.steps.map((step, idx) => (
                                      <div key={idx} className="flex gap-3 text-xs leading-relaxed text-[var(--text-secondary)] font-medium">
                                        <span className="font-extrabold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded h-fit shrink-0 mt-0.5">Step {idx + 1}</span>
                                        <div className="flex-1 overflow-hidden"><AstNodeRenderer nodes={AIResponseParser.parse(step)} /></div>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* 3. FORMULA SUMMARY CARD */}
                        {data.formulas && data.formulas.length > 0 && (
                          <div id="card-formulas" className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                            <button
                              onClick={() => setExpandedCards(prev => ({ ...prev, formulas: !prev.formulas }))}
                              className="w-full flex justify-between items-center px-4 py-3 bg-[var(--surface-secondary)]/30 border-b border-[var(--border-subtle)] text-left"
                            >
                              <span className="text-xs font-extrabold uppercase text-[var(--text-primary)] tracking-wider flex items-center gap-1.5">
                                <Lightbulb className="w-4 h-4 text-amber-500" />
                                3. Key Formulas & LaTeX
                              </span>
                              {expandedCards.formulas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            <AnimatePresence initial={false}>
                              {expandedCards.formulas && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2, ease: "easeInOut" }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-4 space-y-2.5">
                                    {data.formulas.map((form, idx) => (
                                      <div key={idx} className="p-2.5 bg-[var(--surface-secondary)]/50 rounded-xl flex items-center justify-between border border-[var(--border-subtle)] gap-4">
                                        <div className="text-xs font-semibold text-[var(--text-primary)] flex-1 overflow-hidden">
                                          <span className="font-extrabold mr-1">Formula {idx + 1}:</span>
                                          <AstNodeRenderer nodes={AIResponseParser.parse(form)} className="inline-block" />
                                        </div>
                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(form);
                                            useToastStore.getState().show("Formula copied to clipboard!");
                                          }}
                                          className="text-[9px] font-black uppercase text-indigo-500 hover:underline shrink-0"
                                        >
                                          Copy
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* 4. SHORTCUT TRICK CARD */}
                        {data.shortcut && (
                          <div id="card-shortcut" className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                            <button
                              onClick={() => setExpandedCards(prev => ({ ...prev, shortcut: !prev.shortcut }))}
                              className="w-full flex justify-between items-center px-4 py-3 bg-[var(--surface-secondary)]/30 border-b border-[var(--border-subtle)] text-left"
                            >
                              <span className="text-xs font-extrabold uppercase text-[var(--text-primary)] tracking-wider flex items-center gap-1.5">
                                <Zap className="w-4 h-4 text-violet-500" />
                                4. Time-Saving Shortcut Trick
                              </span>
                              {expandedCards.shortcut ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            <AnimatePresence initial={false}>
                              {expandedCards.shortcut && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2, ease: "easeInOut" }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-4 text-xs text-[var(--text-secondary)] font-bold bg-violet-50/20 dark:bg-violet-950/5 leading-relaxed">
                                    <AstNodeRenderer nodes={AIResponseParser.parse(data.shortcut)} />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* 5. INDIVIDUAL DIAGNOSTIC ALERT */}
                        {data.personalizedContextNotes && (
                          <div className="bg-rose-50/30 dark:bg-rose-950/5 border border-rose-500/20 rounded-2xl p-4 flex gap-3 items-start shadow-sm">
                            <HelpCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
                            <div className="flex-1 overflow-hidden">
                              <span className="block text-[10px] font-black uppercase tracking-widest text-rose-500 mb-0.5">Why YOU Made This Mistake (Diagnostic Insight)</span>
                              <div className="text-xs leading-relaxed text-[var(--text-secondary)] font-medium">
                                <AstNodeRenderer nodes={AIResponseParser.parse(data.personalizedContextNotes)} />
                              </div>
                            </div>
                          </div>
                        )}

                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Chat processing state animation */}
              {chatLoading && (
                <div className="flex gap-2 items-center text-xs text-[var(--text-muted)] max-w-xs bg-[var(--surface)] border border-[var(--border-subtle)] px-3 py-2 rounded-xl shadow-sm animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                  <span>AI Tutor is drafting conceptual response...</span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Bottom Panel: Interactive Follow-up Chat Input */}
            <div className="flex-none p-4 border-t border-[var(--border)] bg-[var(--surface)] space-y-3">

              {/* Dynamic Quick follow-up buttons (Part 10: Auto follow-up asks) */}
              {explanation && (
                <div className="flex flex-wrap gap-1.5 justify-center max-w-3xl mx-auto">
                  {[
                    { label: "Harder question", prompt: "Can you give me a harder practice question on this concept?" },
                    { label: "Simpler question", prompt: "Can you simplify this concept with an easier example?" },
                    { label: "Another approach", prompt: "Is there another mathematical approach or alternative solution to solve this?" },
                    { label: "Visual explanation", prompt: "Can you provide a visual ASCII chart or transition diagram for this?" },
                    { label: "Shortcut", prompt: "Show me a fast elimination trick or mental shortcut rules." },
                    { label: "Proof", prompt: "Derive the mathematical proof for this formula/concept." },
                    { label: "Interview version", prompt: "Explain how to present this concept verbally in a technical interview." },
                    { label: "Revision notes", prompt: "Draft quick bullet point revision notes highlighting key formulas." }
                  ].map((pill, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={chatLoading}
                      onClick={() => {
                        setChatInput(pill.prompt);
                        setTimeout(() => {
                          const submitBtn = document.getElementById("send-chat-submit");
                          submitBtn?.click();
                        }, 50);
                      }}
                      className="text-[10px] px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-extrabold uppercase rounded-lg border border-indigo-500/10 transition cursor-pointer disabled:opacity-50"
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendChat} className="flex gap-2 items-center max-w-3xl mx-auto">
                <input
                  type="text"
                  placeholder="Ask follow-up... (e.g. 'Why is option B wrong?', 'Explain visually')"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading || loading}
                  className="flex-1 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 text-[var(--text-primary)] font-semibold"
                />
                <button
                  id="send-chat-submit"
                  type="submit"
                  disabled={chatLoading || loading || !chatInput.trim()}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition disabled:opacity-40 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </section>

          {/* RIGHT PANEL: Outline / Saved Practice / Notes (Width 30%) */}
          {!isRightPanelCollapsed && (
            <section className="w-full lg:w-80 border-l border-[var(--border)] bg-[var(--surface)] flex flex-col h-full overflow-hidden shrink-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">

                {/* Outline index navigator */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsOutlineCollapsed(!isOutlineCollapsed)}
                    className="w-full flex justify-between items-center text-left focus:outline-none cursor-pointer group"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition">Tutor Outline Navigator</span>
                    {isOutlineCollapsed ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition" />
                    )}
                  </button>
                  {!isOutlineCollapsed && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      <button
                        onClick={() => scrollToCard("overview")}
                        className="flex justify-between items-center text-left text-xs p-2 rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] font-semibold cursor-pointer transition"
                      >
                        <span>1. Concept Overview</span>
                        <span className="text-[9px] bg-[var(--surface-secondary)] px-1.5 py-0.5 rounded font-black text-[var(--text-muted)]">ALT+1</span>
                      </button>
                      <button
                        onClick={() => scrollToCard("steps")}
                        className="flex justify-between items-center text-left text-xs p-2 rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] font-semibold cursor-pointer transition"
                      >
                        <span>2. Step-by-Step Proof</span>
                        <span className="text-[9px] bg-[var(--surface-secondary)] px-1.5 py-0.5 rounded font-black text-[var(--text-muted)]">ALT+2</span>
                      </button>
                      <button
                        onClick={() => scrollToCard("formulas")}
                        className="flex justify-between items-center text-left text-xs p-2 rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] font-semibold cursor-pointer transition"
                      >
                        <span>3. Latex Formulas</span>
                        <span className="text-[9px] bg-[var(--surface-secondary)] px-1.5 py-0.5 rounded font-black text-[var(--text-muted)]">ALT+3</span>
                      </button>
                      <button
                        onClick={() => scrollToCard("shortcut")}
                        className="flex justify-between items-center text-left text-xs p-2 rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] font-semibold cursor-pointer transition"
                      >
                        <span>4. Shortcut Tricks</span>
                        <span className="text-[9px] bg-[var(--surface-secondary)] px-1.5 py-0.5 rounded font-black text-[var(--text-muted)]">ALT+4</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Personal notes attachments editor */}
                <div className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Workspace Notes</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={handleAutoNotes}
                        disabled={generatingNotes}
                        className="text-[9px] font-extrabold uppercase bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded border border-indigo-500/20 cursor-pointer disabled:opacity-50"
                      >
                        {generatingNotes ? "Drafting..." : "Auto Notes"}
                      </button>
                      <button
                        onClick={handleSaveNotes}
                        className="text-[9px] font-extrabold uppercase bg-indigo-600 text-white px-2 py-0.5 rounded shadow-sm cursor-pointer"
                      >
                        Save Notes
                      </button>
                    </div>
                  </div>
                  <textarea
                    placeholder="Type personal study observations, key shortcuts to keep, or notes here..."
                    value={personalNotes}
                    onChange={(e) => setPersonalNotes(e.target.value)}
                    className="w-full h-24 p-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                {/* Dynamic practice generation trigger & list */}
                <div className="space-y-3 border-t border-[var(--border-subtle)] pt-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Dynamic Practice Set</span>
                      {practiceQuestions.length > 0 && (
                        <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded" title="AI-generated practice — not official GATE questions">
                          <Sparkles className="w-2.5 h-2.5" />
                          AI Generated
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleGeneratePractice}
                      disabled={generatingPractice}
                      className="text-[9px] font-extrabold uppercase bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {generatingPractice ? "Generating..." : "Generate Set"}
                    </button>
                  </div>

                  {generatingPractice ? (
                    <div className="flex items-center gap-2 justify-center py-4 text-xs text-[var(--text-muted)] font-bold">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                      <span>Compiling 8 diverse test questions...</span>
                    </div>
                  ) : practiceQuestions.length === 0 ? (
                    <div className="p-4 text-center border border-dashed border-[var(--border-subtle)] rounded-xl text-[10px] text-[var(--text-muted)] font-semibold">
                      No custom practice questions compiled yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {practiceQuestions.map((q, idx) => {
                        const isExpanded = expandedPracticeId === idx;
                        return (
                          <div 
                            key={idx} 
                            className="bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-sm hover:shadow transition"
                          >
                            <button
                              type="button"
                              onClick={() => setExpandedPracticeId(isExpanded ? null : idx)}
                              className="w-full flex items-center justify-between p-3 text-left focus:outline-none cursor-pointer bg-[var(--surface-secondary)]/30 border-b border-[var(--border-subtle)]/40 hover:bg-[var(--surface-secondary)] transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                                  <span className="text-emerald-600 dark:text-emerald-400">Question {idx + 1}</span>
                                  <span>•</span>
                                  <span>{q.questionType || "MCQ"}</span>
                                  <span>•</span>
                                  <span>{q.difficulty || "Medium"}</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                                    <Sparkles className="w-2.5 h-2.5" /> AI
                                  </span>
                                </div>
                                {!isExpanded && (
                                  <p className="text-[11px] font-bold text-[var(--text-secondary)] truncate mt-1 leading-relaxed">
                                    {q.questionText}
                                  </p>
                                )}
                              </div>
                              <span className="text-[var(--text-muted)] ml-2 shrink-0">
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </span>
                            </button>
                            
                            {isExpanded && (
                              <div className="p-3.5 space-y-3.5 text-xs">
                                <div>
                                  <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1">Question Text</span>
                                  <div className="font-bold text-[var(--text-primary)] leading-relaxed bg-[var(--surface)] p-3 border border-[var(--border-subtle)] rounded-xl whitespace-pre-wrap">
                                    <AstNodeRenderer nodes={AIResponseParser.parse(q.questionText)} />
                                  </div>
                                </div>

                                {q.options && q.options.length > 0 && (
                                  <div className="space-y-1.5">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] block">Options</span>
                                    <div className="grid grid-cols-1 gap-1.5">
                                      {q.options.map(opt => {
                                        const isCorrect = (q.correctOptionIds || []).includes(opt.option_id);
                                        return (
                                          <div 
                                            key={opt.option_id}
                                            className={`p-2.5 rounded-lg border text-xs font-semibold flex items-start gap-2 ${
                                              isCorrect
                                                ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400 font-bold"
                                                : "bg-[var(--surface)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                                            }`}
                                          >
                                            <span className="font-black shrink-0">{opt.option_id}.</span>
                                            <div className="flex-1 overflow-hidden">
                                              <AstNodeRenderer nodes={AIResponseParser.parse(opt.content)} />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {q.natAnswerRange && (
                                  <div className="p-2.5 bg-green-500/10 border border-green-500/30 rounded-lg text-green-700 dark:text-green-400 font-bold text-xs flex justify-between">
                                    <span>NAT Range:</span>
                                    <span className="font-mono">{q.natAnswerRange.min} - {q.natAnswerRange.max}</span>
                                  </div>
                                )}

                                {q.explanation && (
                                  <div className="border-t border-[var(--border-subtle)] pt-3 space-y-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] block">Proof & Explanation</span>
                                    <div className="p-3 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-xl text-[11px] leading-relaxed text-[var(--text-secondary)] font-medium whitespace-pre-wrap">
                                      <AstNodeRenderer nodes={AIResponseParser.parse(q.explanation)} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </section>
          )}

        </main>
      </div>
    </MathJaxContext>
  );
}
