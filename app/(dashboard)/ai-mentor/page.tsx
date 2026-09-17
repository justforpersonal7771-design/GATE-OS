"use client";

import { useEffect, useState, useMemo } from "react";
import { useStudyStore } from "@/store/use-study-store";
import { useAnalyticsStore } from "@/store/use-analytics-store";
import { MemoryEngine, KnowledgeGraph, InsightMemory, MistakePattern, LearnerTimelineMilestone, ReadinessScorecard } from "@/lib/ai/memory/MemoryEngine";
import { AstNodeRenderer } from "@/components/exam/ast-node-renderer";
import { AIResponseParser } from "@/lib/ai/ai-response-parser";
import { 
  Sparkles, Loader2, BrainCircuit, Activity, Clock, Zap, Star, AlertTriangle, 
  HelpCircle, ShieldCheck, TrendingUp, Calendar, BookOpen, Layers, CheckCircle2, Flame, Award
} from "lucide-react";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { MathJaxContext } from "better-react-mathjax";

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

  // Aggregate student stats & masteries across subjects
  const subjectMasteries = useMemo(() => {
    if (!dashboardMetrics) return [];
    return dashboardMetrics.subjectPerformance.map(sub => {
      const averageConfidence = 70; // Mock average confidence index
      const accuracy = sub.attempted > 0 ? (sub.correct / sub.attempted) * 100 : 0;
      return {
        subject: sub.subject,
        masteryIndex: Math.round(accuracy),
        averageConfidence
      };
    });
  }, [dashboardMetrics]);

  // Build Readiness prediction scorecards
  useEffect(() => {
    if (!mounted || loading) return;

    const totalSolved = mistakes.length + bookmarks.length;
    const accuracy = dashboardMetrics?.overview.overallAccuracy || 65;
    const plannerCompletion = 75; // Baseline default planner rate

    const pred = MemoryEngine.predictExamReadiness(
      subjectMasteries,
      totalSolved,
      accuracy,
      plannerCompletion
    );
    setReadiness(pred);
  }, [mounted, loading, subjectMasteries, mistakes, bookmarks, dashboardMetrics]);

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

  // Handle prerequisite diagnosis whenever a topic is selected
  const handleDiagnosePrerequisites = (topic: string) => {
    setSelectedTopic(topic);
    
    // Map topic masteries to mock percentages
    const masteries: Record<string, number> = {};
    mistakes.forEach(m => {
      masteries[m.topic] = m.mastered ? 85 : Math.max(20, 80 - (m.occurrences || 1) * 20);
    });

    const weaknesses = KnowledgeGraph.diagnosePrerequisiteWeaknesses(topic, masteries);
    setDiagnostics(weaknesses);
  };

  // Compile daily personalized coach advice
  const coachAdvice = useMemo(() => {
    if (mistakes.length === 0) {
      return {
        greeting: "Welcome to your AI Mentor Workspace!",
        body: "You have not recorded any study session mistakes yet. Complete mock tests and practice questions to feed context back to the AI coach."
      };
    }

    const weakTopic = mistakes.find(m => !m.mastered)?.topic || "Recursion";
    const pendingCount = mistakes.filter(m => !m.mastered).length;
    
    return {
      greeting: "Good Morning, Student.",
      body: `Yesterday you spent solid time reviewing data structures. However, your concept retention is flagged on "${weakTopic}" because you have ${pendingCount} pending mistakes remaining. Today, we recommend solving 5 review questions in "${weakTopic}" before starting any new subject.`
    };
  }, [mistakes]);

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
        <header className="flex justify-between items-center border-b border-[var(--border)] pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg">
              <BrainCircuit className="w-6 h-6 animate-pulse" />
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
        </header>

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
              <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-md relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-4 translate-x-4">
                  <Sparkles className="w-48 h-48" />
                </div>
                <div className="relative z-10 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200 block">Personalized Daily Advice</span>
                  <h3 className="text-lg font-black">{coachAdvice.greeting}</h3>
                  <p className="text-sm font-semibold leading-relaxed text-indigo-100 max-w-2xl">
                    {coachAdvice.body}
                  </p>
                </div>
              </div>

              {/* Learning Health Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Predict Readiness", val: `${readiness?.expectedMarks ?? 65}%`, desc: `${readiness?.readinessRating} Level`, icon: Award, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
                  { label: "Learning Velocity", val: `${readiness?.velocityScore ?? 50}/100`, desc: "Solving rate index", icon: TrendingUp, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
                  { label: "Spaced Revision Debt", val: `${mistakes.filter(m => !m.mastered).length} items`, desc: "Pending queue", icon: Layers, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
                  { label: "Burnout Risk", val: readiness?.burnoutRisk ?? "Low", desc: "Planner & solves density", icon: Flame, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" }
                ].map((item, idx) => (
                  <div key={idx} className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl flex flex-col justify-between shadow-sm hover:shadow transition">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">{item.label}</span>
                      <span className={`p-1.5 rounded-lg border ${item.color}`}><item.icon className="w-3.5 h-3.5" /></span>
                    </div>
                    <div className="mt-3">
                      <span className="block text-lg font-black text-[var(--text-primary)]">{item.val}</span>
                      <span className="text-[10px] font-bold text-[var(--text-muted)]">{item.desc}</span>
                    </div>
                  </div>
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
                  <div className="flex-1 bg-[var(--surface-secondary)]/30 border border-[var(--border-subtle)] rounded-xl p-4 min-h-[140px] flex flex-col justify-center">
                    {selectedTopic ? (
                      <div className="space-y-3">
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
                              <div key={idx} className="p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-lg flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-extrabold text-[var(--text-primary)] block">{d.topic}</span>
                                  <span className="text-[9px] text-[var(--text-muted)] font-semibold mt-0.5">{d.description}</span>
                                </div>
                                <span className="text-rose-500 font-extrabold font-mono shrink-0 ml-2">Mastery: {d.mastery}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-xs text-[var(--text-muted)] font-semibold">
                        Select a concept from the dropdown list to scan its foundational prerequisite dependency tree.
                      </div>
                    )}
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
                    {savedShortcuts.map(b => (
                      <div key={b.questionId} className="bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] p-4 rounded-xl space-y-2.5 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">{b.subject}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(b.aiShortcut || "");
                              alert("Shortcut trick copied!");
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
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT SIDE PANEL: Predictor Dashboard & Timeline */}
            <div className="space-y-6">
              
              {/* Exam Readiness Predictor (Part 7) */}
              {readiness && (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-extrabold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5 border-b border-[var(--border-subtle)] pb-3">
                    <Award className="w-4 h-4 text-emerald-500 animate-bounce" />
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
                    {mistakePatterns.map(p => (
                      <div key={p.id} className="p-3 bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] rounded-xl space-y-1.5">
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
                      </div>
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
                    {timeline.map(t => (
                      <div key={t.id} className="relative">
                        <span className="absolute -left-[25px] top-1.5 bg-indigo-500 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[var(--surface)]" />
                        <span className="text-[9px] font-bold text-[var(--text-muted)] block">{new Date(t.timestamp).toLocaleDateString()}</span>
                        <span className="font-extrabold text-xs text-[var(--text-primary)] block mt-0.5">{t.title}</span>
                        <p className="text-[11px] font-semibold text-[var(--text-secondary)] leading-relaxed mt-0.5">
                          {t.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </div>
    </MathJaxContext>
  );
}
