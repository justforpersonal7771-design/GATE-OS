"use client";

import { useEffect, useState, useMemo } from "react";
import { useStudyStore } from "@/store/use-study-store";
import { useAnalyticsStore } from "@/store/use-analytics-store";
import { MemoryEngine, KnowledgeGraph, InsightMemory, MistakePattern, LearnerTimelineMilestone, ReadinessScorecard } from "@/lib/ai/memory/MemoryEngine";
import { MasteryEngine, TopicMastery } from "@/lib/learning/MasteryEngine";
import { IDBManager } from "@/lib/repository/storage/idb-manager";
import { AstNodeRenderer } from "@/components/exam/ast-node-renderer";
import { AIResponseParser } from "@/lib/ai/ai-response-parser";
import { 
  Sparkles, Loader2, BrainCircuit, Activity, Clock, Zap, Star, AlertTriangle, 
  HelpCircle, ShieldCheck, TrendingUp, Calendar, BookOpen, Layers, CheckCircle2, Flame, Award
} from "lucide-react";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { MathJaxContext } from "better-react-mathjax";
import { useToastStore } from "@/store/use-toast-store";
import { AnimatePresence, motion } from "motion/react";

export default function AIMentorPage() {
  const { mistakes, bookmarks, loadStudyData } = useStudyStore();
  const { dashboardMetrics, refreshAnalytics } = useAnalyticsStore();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  
  // Dynamic AI Mentor Metrics
  const [readiness, setReadiness] = useState<ReadinessScorecard | null>(null);
  const [timeline, setTimeline] = useState<LearnerTimelineMilestone[]>([]);
  const [mistakePatterns, setMistakePatterns] = useState<MistakePattern[]>([]);
  
  // Prerequisites diagnostic state
  const [diagnostics, setDiagnostics] = useState<{ topic: string; mastery: number; description: string }[]>([]);

  // Real computed inputs for readiness prediction — never fabricated.
  const [topicMasteryMap, setTopicMasteryMap] = useState<Record<string, TopicMastery>>({});
  const [plannerCompletion, setPlannerCompletion] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    const loadMentorData = async () => {
      setLoading(true);
      await loadStudyData();
      await refreshAnalytics();
      await MemoryEngine.initialize();
      setLoading(false);
    };
    loadMentorData();
  }, [loadStudyData, refreshAnalytics]);

  // Aggregate student stats & masteries across subjects. Confidence is the
  // average of real per-mistake confidence scores recorded for that subject;
  // when no mistake has been logged for it yet, accuracy is the closest real
  // signal we have, so we fall back to that instead of a fabricated constant.
  const subjectMasteries = useMemo(() => {
    if (!dashboardMetrics) return [];
    return dashboardMetrics.subjectPerformance.map(sub => {
      const accuracy = sub.attempted > 0 ? (sub.correct / sub.attempted) * 100 : 0;
      const subjectMistakeConfidences = mistakes
        .filter(m => m.subject === sub.subject && typeof m.confidence === "number")
        .map(m => m.confidence as number);
      const averageConfidence = subjectMistakeConfidences.length > 0
        ? Math.round(subjectMistakeConfidences.reduce((a, b) => a + b, 0) / subjectMistakeConfidences.length)
        : Math.round(accuracy);
      return {
        subject: sub.subject,
        masteryIndex: Math.round(accuracy),
        averageConfidence
      };
    });
  }, [dashboardMetrics, mistakes]);

  // Compute real topic mastery (reusing the same MasteryEngine the rest of the
  // app uses) and real planner completion from actual calendar events.
  useEffect(() => {
    if (!mounted || loading) return;

    const computeRealInputs = async () => {
      const { QuestionRepository } = await import("@/lib/repository/question-repository");
      await QuestionRepository.initialize();
      const allQuestions = QuestionRepository.getAllQuestions();
      const sessionRecords = await IDBManager.getAllExamSessions();
      const sessions = sessionRecords.map(r => r.sessionData as any);
      setTopicMasteryMap(MasteryEngine.calculateTopicMastery(allQuestions, sessions, mistakes));

      const events = await IDBManager.getCalendarEvents();
      if (events.length === 0) {
        // No planner data yet — use a neutral midpoint rather than a fabricated
        // "typical" completion rate, so it neither rewards nor penalizes readiness.
        setPlannerCompletion(50);
      } else {
        const completed = events.filter(e => e.completed).length;
        setPlannerCompletion(Math.round((completed / events.length) * 100));
      }
    };
    computeRealInputs();
  }, [mounted, loading, mistakes]);

  // Build Readiness prediction scorecards
  useEffect(() => {
    if (!mounted || loading || plannerCompletion === null) return;

    const totalSolved = mistakes.length + bookmarks.length;
    const accuracy = dashboardMetrics?.overview.overallAccuracy ?? 0;

    const pred = MemoryEngine.predictExamReadiness(
      subjectMasteries,
      totalSolved,
      accuracy,
      plannerCompletion
    );
    setReadiness(pred);
  }, [mounted, loading, subjectMasteries, mistakes, bookmarks, dashboardMetrics, plannerCompletion]);

  // Scan and discover mistakes patterns
  useEffect(() => {
    if (!mounted || loading) return;

    const runMistakesScan = async () => {
      const { QuestionRepository } = await import("@/lib/repository/question-repository");
      await QuestionRepository.initialize();
      const pats = await InsightMemory.scanMistakePatterns(mistakes, QuestionRepository);
      setMistakePatterns(pats);
    };
    runMistakesScan();
  }, [mounted, loading, mistakes]);

  // Compile student milestones timeline
  useEffect(() => {
    if (!mounted || loading) return;

    const buildTimeline = async () => {
      const logs = await MemoryEngine.getLearnerTimeline(bookmarks, mistakes);
      setTimeline(logs);
    };
    buildTimeline();
  }, [mounted, loading, bookmarks, mistakes]);

  // Filter bookmarked shortcuts list
  const savedShortcuts = useMemo(() => {
    return bookmarks.filter(b => b.isShortcutOnly || b.aiShortcut);
  }, [bookmarks]);

  // Handle prerequisite diagnosis whenever a topic is selected. Uses the same
  // real MasteryEngine scores the rest of the app relies on (topicMasteryMap),
  // not an ad hoc estimate.
  const handleDiagnosePrerequisites = (topic: string) => {
    setSelectedTopic(topic);

    const masteries: Record<string, number> = {};
    Object.values(topicMasteryMap).forEach(tm => {
      masteries[tm.topic] = tm.score;
    });

    const weaknesses = KnowledgeGraph.diagnosePrerequisiteWeaknesses(topic, masteries);
    setDiagnostics(weaknesses);
  };

  // Compile daily personalized coach advice — every claim below is derived
  // from real stored data (streak/lastActiveDate/mistakes); nothing is invented.
  const coachAdvice = useMemo(() => {
    if (mistakes.length === 0) {
      return {
        greeting: "Welcome to your AI Mentor Workspace!",
        body: "You have not recorded any study session mistakes yet. Complete mock tests and practice questions to feed context back to the AI coach."
      };
    }

    const pendingMistakes = mistakes.filter(m => !m.mastered);
    const weakTopic = pendingMistakes[0]?.topic;
    const pendingCount = pendingMistakes.length;

    const lastActiveDate = dashboardMetrics?.overview.lastActiveDate;
    const streak = dashboardMetrics?.overview.currentStreak ?? 0;
    const activitySummary = lastActiveDate
      ? `You were last active on ${new Date(lastActiveDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}${streak > 0 ? ` (${streak}-day streak)` : ""}.`
      : "No recent activity is recorded yet.";

    if (!weakTopic || pendingCount === 0) {
      return {
        greeting: "Good to see you back.",
        body: `${activitySummary} You have no open mistakes right now — solid position. Consider a fresh practice set or revisiting bookmarks to keep momentum.`
      };
    }

    return {
      greeting: "Good to see you back.",
      body: `${activitySummary} Your concept retention is flagged on "${weakTopic}" — you have ${pendingCount} pending mistake${pendingCount === 1 ? "" : "s"} there. Today, we recommend reviewing "${weakTopic}" before starting any new subject.`
    };
  }, [mistakes, dashboardMetrics]);

  if (!mounted) return null;

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
      <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 space-y-8 pb-16">
        
        {/* Header command bar */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex justify-between items-center border-b border-[var(--border)] pb-5"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">AI Mentor Dashboard</h1>
              <p className="text-xs font-semibold text-[var(--text-secondary)]">Your proactive personal study coach & readiness predictor.</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] rounded-lg transition text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              Print Report
            </button>
          </div>
        </motion.header>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Syncing complete learning memory logs...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT & CENTER COLLAPSED DUAL COLUMN */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Daily AI Coach Message (Part 2) */}
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 text-white p-6 rounded-2xl shadow-lg shadow-indigo-600/20 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-400/20 rounded-full blur-3xl -ml-8 -mb-8 pointer-events-none" />
                <div className="relative z-10 space-y-3">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-white/15 px-3 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    Personalized Daily Advice
                  </span>
                  <h3 className="text-lg font-black">{coachAdvice.greeting}</h3>
                  <p className="text-sm font-semibold leading-relaxed text-indigo-100 max-w-2xl">
                    {coachAdvice.body}
                  </p>
                </div>
              </motion.div>

              {/* Learning Health Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Predict Readiness", val: `${readiness?.expectedMarks ?? 65}%`, desc: `${readiness?.readinessRating} Level`, icon: Award, badge: "bg-emerald-500/10", color: "text-emerald-500", glow: "bg-emerald-500" },
                  { label: "Learning Velocity", val: `${readiness?.velocityScore ?? 50}/100`, desc: "Solving rate index", icon: TrendingUp, badge: "bg-indigo-500/10", color: "text-indigo-500", glow: "bg-indigo-500" },
                  { label: "Spaced Revision Debt", val: `${mistakes.filter(m => !m.mastered).length} items`, desc: "Pending queue", icon: Layers, badge: "bg-amber-500/10", color: "text-amber-500", glow: "bg-amber-500" },
                  { label: "Burnout Risk", val: readiness?.burnoutRisk ?? "Low", desc: "Planner & solves density", icon: Flame, badge: "bg-rose-500/10", color: "text-rose-500", glow: "bg-rose-500" }
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                    className="relative bg-[var(--surface)] border border-[var(--border)] p-4 rounded-2xl flex flex-col justify-between shadow-sm hover-lift overflow-hidden group"
                  >
                    <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-[0.15] ${item.glow} pointer-events-none group-hover:opacity-25 transition-opacity`} />
                    <div className={`relative w-9 h-9 rounded-xl ${item.badge} flex items-center justify-center mb-3`}>
                      <item.icon className={`w-4.5 h-4.5 ${item.color}`} />
                    </div>
                    <span className="relative text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">{item.label}</span>
                    <div className="relative mt-1.5">
                      <span className="block text-2xl font-black text-[var(--text-primary)] font-mono tracking-tight">{item.val}</span>
                      <span className="text-[10px] font-bold text-[var(--text-muted)]">{item.desc}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* AI Prerequisite Knowledge Graph */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-500" />
                      Concept Prerequisite Knowledge Graph
                    </h3>
                    <p className="text-[11px] font-semibold text-[var(--text-muted)] mt-0.5">Diagnose underlying concept weaknesses before revising topics.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Selectors List */}
                  <div className="w-full sm:w-64 space-y-2">
                    <span className="text-[10px] font-black uppercase text-[var(--text-muted)] block">Select Target Topic</span>
                    <CustomDropdown
                      value={selectedTopic}
                      onChange={handleDiagnosePrerequisites}
                      options={KnowledgeGraph.getAllNodes().map(n => ({ label: n.topic, value: n.topic }))}
                      placeholder="Choose topic..."
                      className="text-xs font-bold w-full"
                    />
                  </div>

                  {/* Diagnostic Output */}
                  <div className="flex-1 bg-[var(--surface-secondary)]/30 border border-[var(--border-subtle)] rounded-xl p-4 min-h-[140px] flex flex-col justify-center overflow-hidden">
                    <AnimatePresence mode="wait">
                    {selectedTopic ? (
                      <motion.div
                        key={selectedTopic}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-[var(--text-primary)]">{selectedTopic}</span>
                          <span className="text-[9px] bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded font-black uppercase">Active Nodes Checked</span>
                        </div>

                        {diagnostics.length === 0 ? (
                          <p className="text-xs font-semibold text-[var(--text-secondary)] leading-relaxed flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            All prerequisite dependencies have high mastery levels. Your foundation is solid!
                          </p>
                        ) : (
                          <div className="space-y-2">
                            <span className="text-[9px] font-black uppercase text-rose-500 block">Critical Foundational Gaps Found:</span>
                            {diagnostics.map((d, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-lg flex items-center justify-between text-xs"
                              >
                                <div>
                                  <span className="font-extrabold text-[var(--text-primary)] block">{d.topic}</span>
                                  <span className="text-[9px] text-[var(--text-muted)] font-semibold mt-0.5">{d.description}</span>
                                </div>
                                <span className="text-rose-500 font-extrabold font-mono shrink-0 ml-2">Mastery: {d.mastery}%</span>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <div className="text-center text-xs text-[var(--text-muted)] font-semibold">
                        Select a concept from the dropdown list to scan its foundational prerequisite dependency tree.
                      </div>
                    )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Saved Shortcuts Library (Part 4) */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-3">
                  <h3 className="text-sm font-extrabold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Shortcut & Exam Trick Library
                  </h3>
                  <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-black uppercase">{savedShortcuts.length} Saved</span>
                </div>

                {savedShortcuts.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--text-muted)] font-semibold border border-dashed border-[var(--border-subtle)] rounded-xl">
                    No shortcut tricks saved yet. Click "Save Shortcut" inside the AI Tutor workspace to build your custom memory cheat sheet!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savedShortcuts.map((b, idx) => (
                      <motion.div
                        key={b.questionId}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                        className="bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] p-4 rounded-xl space-y-2.5 shadow-sm hover-lift"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">{b.subject}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(b.aiShortcut || "");
                              useToastStore.getState().show("Shortcut trick copied!");
                            }}
                            className="text-[9px] font-black uppercase text-indigo-500 hover:underline"
                          >
                            Copy Formula
                          </button>
                        </div>
                        <h4 className="font-extrabold text-xs text-[var(--text-primary)]">{b.topic}</h4>
                        <div className="p-3 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg text-xs leading-relaxed text-[var(--text-secondary)] font-medium">
                          <AstNodeRenderer nodes={AIResponseParser.parse(b.aiShortcut || "")} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT SIDE PANEL: Predictor Dashboard & Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-6"
            >

              {/* Exam Readiness Predictor (Part 7) */}
              {readiness && (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-extrabold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5 border-b border-[var(--border-subtle)] pb-3">
                    <Award className="w-4 h-4 text-emerald-500" />
                    Readiness Predictor
                  </h3>

                  <div className="space-y-4">
                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl text-center space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 block">Expected Marks Rank</span>
                      <h4 className="text-3xl font-black text-emerald-700 dark:text-emerald-400 font-mono">#{readiness.expectedRank}</h4>
                      <span className="text-[10px] text-emerald-600 font-bold block">Interval Range: {readiness.confidenceInterval[0]} - {readiness.confidenceInterval[1]} Marks</span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center py-1.5 border-b border-[var(--border-subtle)]">
                        <span className="text-[var(--text-muted)] font-semibold">Suggested Mock Attempt Date</span>
                        <span className="font-bold text-[var(--text-primary)] flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-indigo-500" /> {readiness.suggestedMockDate}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-1.5 border-b border-[var(--border-subtle)]">
                        <span className="text-[var(--text-muted)] font-semibold">Target Revision Cycle Done</span>
                        <span className="font-bold text-[var(--text-primary)] flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {readiness.revisionCompletionDate}</span>
                      </div>

                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-[var(--text-muted)] font-semibold">Readiness Status</span>
                        <span className="px-2 py-0.5 bg-emerald-500 text-white rounded text-[9px] font-black uppercase tracking-wider">{readiness.readinessRating}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mistake Cognitive Patterns (Part 5) */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5 border-b border-[var(--border-subtle)] pb-3">
                  <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                  Mistake Cognitive Patterns
                </h3>

                {mistakePatterns.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[var(--text-muted)] font-semibold">
                    Scanning active mistake behaviors... No structural flaws compiled yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mistakePatterns.map((p, idx) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.06 }}
                        className="p-3 bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] rounded-xl space-y-1.5"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-black text-xs text-[var(--text-primary)]">{p.name}</span>
                          <span className="text-[9px] font-black uppercase text-rose-500">Prob: {p.probability}%</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed font-semibold">
                          {p.description}
                        </p>
                        <details className="cursor-pointer text-[10px] text-indigo-500 font-extrabold">
                          <summary className="hover:underline">Suggested AI Coaching Fix</summary>
                          <p className="mt-1 p-2 bg-[var(--surface)] border border-[var(--border-subtle)] rounded text-[10px] text-[var(--text-secondary)] font-medium leading-relaxed">
                            {p.suggestedFix}
                          </p>
                        </details>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Learning Timeline Journey Map (Part 12) */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5 border-b border-[var(--border-subtle)] pb-3">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  Your Learning Timeline
                </h3>

                {timeline.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[var(--text-muted)] font-semibold">
                    No active timeline logs compiled. Master mistakes or add bookmarks to seed milestones.
                  </div>
                ) : (
                  <div className="relative border-l-2 border-indigo-100 dark:border-indigo-950/60 ml-2 pl-4 space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {timeline.map((t, idx) => (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                        className="relative"
                      >
                        <span className="absolute -left-[25px] top-1.5 bg-indigo-500 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[var(--surface)]" />
                        <span className="text-[9px] font-bold text-[var(--text-muted)] block">{new Date(t.timestamp).toLocaleDateString()}</span>
                        <span className="font-extrabold text-xs text-[var(--text-primary)] block mt-0.5">{t.title}</span>
                        <p className="text-[11px] font-semibold text-[var(--text-secondary)] leading-relaxed mt-0.5">
                          {t.description}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

            </motion.div>

          </div>
        )}

      </div>
    </MathJaxContext>
  );
}
