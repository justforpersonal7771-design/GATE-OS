"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { IDBManager } from "@/lib/repository/storage/idb-manager";
import { ExamSession } from "@/types/exam-runtime.types";
import { QuestionRepository } from "@/lib/repository/question-repository";
import { useExamRuntimeStore } from "@/store/use-exam-runtime-store";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "motion/react";
import {
  Award, Clock, Target, AlertCircle, CheckCircle,
  XCircle, ArrowRight, Home, RefreshCw, BarChart2, ListFilter, HelpCircle, Sparkles, TrendingUp
} from "lucide-react";

/** Animated count-up for a numeric value, e.g. marks or accuracy percentage. */
function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => v.toFixed(decimals));
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 1, ease: "easeOut" });
    const unsubscribe = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display}</>;
}

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
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - circumference * accuracyRatio;

  const verdict =
    accuracy >= 80
      ? { label: "Outstanding Performance!", message: "You're demonstrating strong command over this material. Keep this momentum going." }
      : accuracy >= 60
      ? { label: "Solid Effort", message: "A good foundation is showing. Review your mistakes to close the gap to excellent." }
      : accuracy >= 40
      ? { label: "Room to Grow", message: "You're making progress. Focus revision time on the weakest topics below." }
      : { label: "Keep Practicing", message: "Every attempt builds understanding. Review the breakdown and revisit the fundamentals." };

  return (
    <div className="w-full mx-auto bg-[var(--background)] font-sans flex flex-col gap-6 lg:h-full lg:overflow-hidden">

      {/* Hero verdict banner */}
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="shrink-0 relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 text-white p-6 md:p-8 shadow-xl shadow-indigo-600/20"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
          {/* Accuracy ring */}
          <div className="relative w-32 h-32 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r={radius} strokeWidth="8" className="stroke-white/20 fill-none" />
              <motion.circle
                cx="64"
                cy="64"
                r={radius}
                strokeWidth="8"
                className="stroke-white fill-none"
                strokeDasharray={circumference}
                strokeLinecap="round"
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black font-mono"><CountUp value={accuracy} decimals={0} />%</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-100">Accuracy</span>
            </div>
          </div>

          <div className="flex-1 text-center lg:text-left space-y-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-white/15 px-3 py-1 rounded-full">
              <Sparkles className="w-3 h-3" />
              Evaluation Complete
            </span>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">{verdict.label}</h1>
            <p className="text-indigo-100 text-sm font-semibold max-w-lg">{verdict.message}</p>
            <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest pt-1">
              CBT Diagnostic for {session.draftConfig.config.examType.replace("_", " ")}
            </p>
          </div>

          <div className="flex gap-6 lg:gap-8 shrink-0">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-black font-mono"><CountUp value={marks} decimals={2} /></div>
              <div className="text-[9px] font-black uppercase tracking-widest text-indigo-200">/ {maxPossibleMarks} Marks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-black font-mono">{m}m {s}s</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-indigo-200 flex items-center gap-1 justify-center">
                <Clock className="w-3 h-3" /> Time Taken
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:flex-1 lg:min-h-0">

        {/* Left Side: Score breakdown & actions (Spans 7) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-7 lg:self-start lg:max-h-full lg:overflow-y-auto custom-scrollbar bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-sm p-6 md:p-8 space-y-6"
        >
          <div>
            <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1">Attempted vs Skipped</span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-2xl font-black text-[var(--text-primary)] font-mono">{totalAttempted}</span>
                <span className="text-sm font-bold text-[var(--text-muted)] font-mono"> / {session.totalQuestions}</span>
                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-0.5">Attempted</p>
              </div>
              <div>
                <span className="text-2xl font-black text-[var(--text-primary)] font-mono">{session.totalQuestions - totalAttempted}</span>
                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-0.5">Skipped Tasks</p>
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: CheckCircle, label: "Correct", value: correct, color: "text-emerald-500" },
              { icon: XCircle, label: "Wrong", value: wrong, color: "text-rose-500" },
              { icon: TrendingUp, label: "+ Marks", value: `+${totalPositiveMarks.toFixed(1)}`, color: "text-emerald-600 dark:text-emerald-500" },
              { icon: AlertCircle, label: "- Penalty", value: `-${totalNegativeMarks.toFixed(1)}`, color: "text-red-500 dark:text-red-400" },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + idx * 0.05 }}
                className="bg-[var(--surface-secondary)] border border-[var(--border)] p-4 rounded-2xl flex flex-col items-center justify-center text-center hover-lift"
              >
                <stat.icon className={`w-5 h-5 mb-1 ${stat.color}`} />
                <span className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${stat.label.includes("Marks") || stat.label.includes("Penalty") ? stat.color : "text-[var(--text-muted)]"}`}>{stat.label}</span>
                <span className="text-base font-black text-[var(--text-primary)] font-mono">{stat.value}</span>
              </motion.div>
            ))}
          </div>

          {/* Actions Desk */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-[var(--border-subtle)]">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/")}
              className="flex-1 px-5 py-3.5 bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] font-bold uppercase tracking-wider rounded-xl transition shadow-sm text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Dashboard</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleRetry}
              className="flex-1 px-5 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold uppercase tracking-wider rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Test</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push(`/exam/results/review?id=${id}`)}
              className="flex-[1.5] px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-500/10 transition flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              <span>Launch Review Mode</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>

        {/* Right Side: Tabbed diagnostics breakdown matrix (Spans 5) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="lg:col-span-5 bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-sm p-6 flex flex-col min-h-[420px] lg:h-full lg:min-h-0"
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
                  className={`relative flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${activeTab === tab ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                >
                  {activeTab === tab && (
                    <motion.div
                      layoutId="results-tab-pill"
                      className="absolute inset-0 bg-[var(--surface)] shadow rounded-lg -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Matrix items list */}
          <div className="flex-1 overflow-y-auto pr-1 -mr-1 custom-scrollbar space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {activeBreakdown().map((item, idx) => {
                  const itemAccuracy = item.attempted > 0 ? ((item.correct / item.attempted) * 100) : 0;
                  return (
                    <motion.div
                      key={item.label + idx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                      className="p-4 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm hover-lift"
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
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
