"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { IDBManager } from "@/lib/repository/storage/idb-manager";
import { ExamSession } from "@/types/exam-runtime.types";
import { QuestionRepository } from "@/lib/repository/question-repository";
import { useExamRuntimeStore } from "@/store/use-exam-runtime-store";
import { motion } from "framer-motion";
import { 
  Award, Clock, Target, AlertCircle, CheckCircle, 
  XCircle, ArrowRight, Home, RefreshCw, BarChart2, ListFilter, HelpCircle
} from "lucide-react";

export default function ResultSummaryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams?.get("id");
  const [session, setSession] = useState<ExamSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"subject" | "section" | "difficulty" | "type">("subject");

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

  const statsCalculations = useMemo(() => {
    if (!session) return null;

    let marks = 0;
    let correct = 0;
    let wrong = 0;
    let totalAttempted = 0;
    let maxPossibleMarks = 0;
    let totalPositiveMarks = 0;
    let totalNegativeMarks = 0;

    const subjectSplits: Record<string, { attempted: number; correct: number; wrong: number; marks: number, max: number }> = {};
    const sectionSplits: Record<string, { attempted: number; correct: number; wrong: number; marks: number, max: number }> = {};
    const difficultySplits: Record<string, { attempted: number; correct: number; wrong: number; marks: number, max: number }> = {};
    const typeSplits: Record<string, { attempted: number; correct: number; wrong: number; marks: number, max: number }> = {};

    session.draftConfig.questions.forEach(qRef => {
      const q = QuestionRepository.getQuestionById(qRef.questionId);
      if (!q) return;

      maxPossibleMarks += q.marks;
      
      const subj = q.subject || "General";
      const sect = q.section || "General";
      const diff = q.difficulty || "Medium";
      const qtype = q.question_type || "MCQ";

      if (!subjectSplits[subj]) subjectSplits[subj] = { attempted: 0, correct: 0, wrong: 0, marks: 0, max: 0 };
      if (!sectionSplits[sect]) sectionSplits[sect] = { attempted: 0, correct: 0, wrong: 0, marks: 0, max: 0 };
      if (!difficultySplits[diff]) difficultySplits[diff] = { attempted: 0, correct: 0, wrong: 0, marks: 0, max: 0 };
      if (!typeSplits[qtype]) typeSplits[qtype] = { attempted: 0, correct: 0, wrong: 0, marks: 0, max: 0 };

      subjectSplits[subj].max += q.marks;
      sectionSplits[sect].max += q.marks;
      difficultySplits[diff].max += q.marks;
      typeSplits[qtype].max += q.marks;

      const res = Object.values(session.responses).find(r => r.questionId === q.question_id);
      if (res && (res.status === "ANSWERED" || res.status === "MARKED_AND_ANSWERED")) {
        totalAttempted++;
        subjectSplits[subj].attempted++;
        sectionSplits[sect].attempted++;
        difficultySplits[diff].attempted++;
        typeSplits[qtype].attempted++;

        let isCorrect = false;
        if (q.question_type === "MCQ" || q.question_type === "MSQ") {
          const correctOpts = q.options.filter(o => o.is_correct).map(o => o.option_id).sort();
          const selectedOpts = [...(res.selectedOptions || [])].sort();
          isCorrect = JSON.stringify(correctOpts) === JSON.stringify(selectedOpts);
        } else if (q.question_type === "NAT") {
          const val = parseFloat(res.natValue || "");
          if (!isNaN(val) && q.nat_answer_range) {
             isCorrect = val >= q.nat_answer_range.min && val <= q.nat_answer_range.max;
          }
        }
        
        if (isCorrect) {
          correct++;
          subjectSplits[subj].correct++;
          sectionSplits[sect].correct++;
          difficultySplits[diff].correct++;
          typeSplits[qtype].correct++;

          marks += q.marks;
          subjectSplits[subj].marks += q.marks;
          sectionSplits[sect].marks += q.marks;
          difficultySplits[diff].marks += q.marks;
          typeSplits[qtype].marks += q.marks;

          totalPositiveMarks += q.marks;
        } else {
          wrong++;
          subjectSplits[subj].wrong++;
          sectionSplits[sect].wrong++;
          difficultySplits[diff].wrong++;
          typeSplits[qtype].wrong++;

          if (q.question_type === "MCQ") {
             const penalty = (q.marks / 3);
             marks -= penalty;
             subjectSplits[subj].marks -= penalty;
             sectionSplits[sect].marks -= penalty;
             difficultySplits[diff].marks -= penalty;
             typeSplits[qtype].marks -= penalty;
             totalNegativeMarks += penalty;
          }
        }
      }
    });

    const accuracy = totalAttempted > 0 ? (correct / totalAttempted) * 100 : 0;
    const m = Math.floor(session.elapsedSeconds / 60);
    const s = session.elapsedSeconds % 60;

    return {
      marks,
      correct,
      wrong,
      totalAttempted,
      maxPossibleMarks,
      totalPositiveMarks,
      totalNegativeMarks,
      accuracy,
      m,
      s,
      subjectSplits,
      sectionSplits,
      difficultySplits,
      typeSplits
    };
  }, [session]);

  const handleRetry = async () => {
    if (!session) return;
    const { startSession } = useExamRuntimeStore.getState();
    await startSession({
      ...session.draftConfig,
      id: crypto.randomUUID()
    });
    router.push("/exam/session");
  };

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--background)]">
       <div className="font-bold tracking-widest uppercase animate-pulse text-indigo-600 dark:text-indigo-400">Loading Result Summary...</div>
    </div>
  );
  
  if (!session || !statsCalculations) return <div className="p-8 text-center text-rose-500 font-bold bg-[var(--background)] h-screen">Result not found.</div>;

  const {
    marks,
    correct,
    wrong,
    totalAttempted,
    maxPossibleMarks,
    totalPositiveMarks,
    totalNegativeMarks,
    accuracy,
    m,
    s,
    subjectSplits,
    sectionSplits,
    difficultySplits,
    typeSplits
  } = statsCalculations;

  // Active split selection based on tab state
  const activeBreakdown = () => {
    switch (activeTab) {
      case "subject": return Object.keys(subjectSplits).map(key => ({ label: key, ...subjectSplits[key] }));
      case "section": return Object.keys(sectionSplits).map(key => ({ label: key, ...sectionSplits[key] }));
      case "difficulty": return Object.keys(difficultySplits).map(key => ({ label: key, ...difficultySplits[key] }));
      case "type": return Object.keys(typeSplits).map(key => ({ label: key, ...typeSplits[key] }));
    }
  };

  const accuracyRatio = accuracy / 100;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - accuracyRatio);

  return (
    <div className="w-full mx-auto p-4 md:p-6 lg:p-8 bg-[var(--background)] h-[calc(100vh-64px)] overflow-hidden font-sans flex flex-col">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch h-full overflow-hidden flex-1">
        
        {/* Left Side: Scorecard card & stats summary (Spans 7) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-7 bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-sm p-6 md:p-8 flex flex-col justify-between h-full overflow-hidden"
        >
          <div className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-[var(--border-subtle)] pb-5">
              <div>
                <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
                  <Award className="w-6 h-6 text-indigo-500" />
                  <span>Evaluation Summary</span>
                </h1>
                <p className="text-xs text-[var(--text-muted)] font-black uppercase tracking-widest mt-1">
                  CBT Diagnostic for {session.draftConfig.config.examType.replace("_", " ")}
                </p>
              </div>
              
              <div className="text-right bg-[var(--surface-secondary)] px-4 py-2 rounded-2xl border border-[var(--border)]">
                <div className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-500" />
                  <span>Elapsed Time</span>
                </div>
                <div className="text-base font-black text-[var(--text-primary)] font-mono">{m}m {s}s</div>
              </div>
            </div>

            {/* Premium Progress accuracy ring and Score columns */}
            <div className="flex flex-col sm:flex-row items-center gap-8 bg-[var(--surface-secondary)] p-6 rounded-3xl border border-[var(--border-subtle)]">
              {/* Progress Ring */}
              <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="56" cy="56" r={radius} className="stroke-gray-200 dark:stroke-gray-800 fill-none" strokeWidth="6" />
                  <motion.circle
                    cx="56"
                    cy="56"
                    r={radius}
                    className="stroke-indigo-500 fill-none"
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-xl font-black font-mono text-[var(--text-primary)]">{accuracy.toFixed(0)}%</span>
                  <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-wider">Accuracy</span>
                </div>
              </div>

              {/* Score breakdown stats */}
              <div className="flex-1 w-full space-y-4">
                <div>
                  <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1">Total Marks Achieved</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter font-mono">{marks.toFixed(2)}</span>
                    <span className="text-sm font-bold text-[var(--text-muted)] font-mono">/ {maxPossibleMarks}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-subtle)]/65">
                  <div>
                    <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-0.5">Attempted</span>
                    <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{totalAttempted} / {session.totalQuestions}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-0.5">Skipped Tasks</span>
                    <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{session.totalQuestions - totalAttempted}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[var(--surface-secondary)] border border-[var(--border)] p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                <CheckCircle className="w-5 h-5 text-emerald-500 mb-1" />
                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Correct</span>
                <span className="text-base font-black text-[var(--text-primary)] font-mono">{correct}</span>
              </div>
              <div className="bg-[var(--surface-secondary)] border border-[var(--border)] p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                <XCircle className="w-5 h-5 text-rose-500 mb-1" />
                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Wrong</span>
                <span className="text-base font-black text-[var(--text-primary)] font-mono">{wrong}</span>
              </div>
              <div className="bg-[var(--surface-secondary)] border border-[var(--border)] p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-1.5">+ Marks</span>
                <span className="text-base font-black text-[var(--text-primary)] font-mono">+{totalPositiveMarks.toFixed(1)}</span>
              </div>
              <div className="bg-[var(--surface-secondary)] border border-[var(--border)] p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest mb-1.5">- Penalty</span>
                <span className="text-base font-black text-[var(--text-primary)] font-mono">-{totalNegativeMarks.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Actions Desk (Part 8) */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-[var(--border-subtle)] mt-8">
            <button 
              onClick={() => router.push("/")} 
              className="flex-1 px-5 py-3.5 bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] font-bold uppercase tracking-wider rounded-xl transition shadow-sm text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <button 
              onClick={handleRetry} 
              className="flex-1 px-5 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold uppercase tracking-wider rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Test</span>
            </button>
            <button 
              onClick={() => router.push(`/exam/results/review?id=${id}`)} 
              className="flex-[1.5] px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-500/10 transition flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              <span>Launch Review Mode</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Right Side: Tabbed diagnostics breakdown matrix (Spans 5) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-5 bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-sm p-6 flex flex-col h-full overflow-hidden"
        >
          {/* Header */}
          <div className="flex-none border-b border-[var(--border-subtle)] pb-4 mb-4">
            <h3 className="text-xs font-extrabold text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-indigo-500" />
              <span>Diagnostics Breakdown</span>
            </h3>
            
            {/* Tabs Row for subject, section, difficulty, type - Part 8 */}
            <div className="flex bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl p-0.5 mt-4 text-[9px] font-black uppercase tracking-wider">
              {(["subject", "section", "difficulty", "type"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === tab ? 'bg-[var(--surface)] shadow text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Matrix items list */}
          <div className="flex-1 overflow-y-auto pr-1 -mr-1 custom-scrollbar space-y-4">
            {activeBreakdown().map((item, idx) => {
              const itemAccuracy = item.attempted > 0 ? ((item.correct / item.attempted) * 100) : 0;
              return (
                <div 
                  key={item.label + idx}
                  className="p-4 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm"
                >
                  <div className="font-bold text-xs text-[var(--text-primary)] mb-3 pb-1 border-b border-[var(--border)]/50 truncate">
                    {item.label}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                    <div className="bg-[var(--surface)] p-2 rounded-xl border border-[var(--border-subtle)]">
                      <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Score</div>
                      <div className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
                        {item.marks.toFixed(1)} <span className="text-[9px] text-[var(--text-muted)] font-normal">/ {item.max}</span>
                      </div>
                    </div>
                    <div className="bg-[var(--surface)] p-2 rounded-xl border border-[var(--border-subtle)]">
                      <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Accuracy</div>
                      <div className="font-mono text-xs text-[var(--text-secondary)]">
                        {itemAccuracy.toFixed(0)}%
                      </div>
                    </div>
                    <div className="bg-[var(--surface)] p-2 rounded-xl border border-[var(--border-subtle)]">
                      <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Attempts</div>
                      <div className="font-mono text-xs text-[var(--text-secondary)] flex justify-center gap-1">
                        <span className="text-emerald-500">{item.correct}</span>
                        <span className="text-[var(--text-muted)]">/</span>
                        <span className="text-rose-500">{item.wrong}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
