"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "motion/react";
import { useStudyStore } from "@/store/use-study-store";
import { useAnalyticsStore } from "@/store/use-analytics-store";
import { useRouter } from "next/navigation";
import { 
  Loader2, RefreshCw, AlertCircle, Sparkles, Folder, Tag, Star, 
  Play, BookOpen, Clock, AlertTriangle, ArrowRight, ShieldCheck 
} from "lucide-react";
import { LearningEngine, PersonalizedIntelligence } from "@/lib/learning/LearningEngine";
import { AdaptiveRevisionItem } from "@/lib/learning/AdaptiveEngine";
import { AstNodeRenderer } from "@/components/exam/ast-node-renderer";
import { AIResponseParser } from "@/lib/ai/ai-response-parser";
import { MathJaxContext } from "better-react-mathjax";

const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: {
    inlineMath: [["\\(", "\\)"]],
    displayMath: [["\\[", "\\]"]],
  },
};

export default function RevisionBuilderPage() {
  const router = useRouter();
  const { mistakes, bookmarks, loadStudyData } = useStudyStore();
  const { dashboardMetrics, refreshAnalytics } = useAnalyticsStore();
  
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"mistakes" | "bookmarks" | "weak_topics" | "ai_insights">("mistakes");
  
  const [intel, setIntel] = useState<PersonalizedIntelligence | null>(null);
  const [loadingIntel, setLoadingIntel] = useState(true);

  useEffect(() => {
    setMounted(true);
    loadStudyData();
    refreshAnalytics();

    setLoadingIntel(true);
    LearningEngine.getPersonalizedIntelligence()
      .then(res => {
        setIntel(res);
        setLoadingIntel(false);
      })
      .catch((e) => {
        console.error(e);
        setLoadingIntel(false);
      });
  }, [loadStudyData, refreshAnalytics]);

  const weakTopics = useMemo(() => {
    if (!dashboardMetrics) return [];
    return dashboardMetrics.topicPerformance.filter(t => {
      const acc = t.attempted > 0 ? (t.correct / t.attempted) * 100 : 0;
      return t.attempted >= 1 && acc < 50;
    });
  }, [dashboardMetrics]);

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const handleStartRevision = () => {
    router.push(`/revision/session?mode=${mode}`);
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "Very High Priority": return "bg-red-500/15 text-red-500 border border-red-500/20";
      case "High": return "bg-amber-500/15 text-amber-500 border border-amber-500/20";
      case "Medium": return "bg-blue-500/15 text-blue-500 border border-blue-500/20";
      case "Low": return "bg-slate-500/15 text-slate-500 border border-slate-500/20";
      default: return "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20";
    }
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
    <div className="w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-4 bg-[var(--background)] font-sans h-full overflow-hidden">

      {/* Title */}
      <div className="shrink-0 flex items-center gap-2">
        <RefreshCw className="w-6 h-6 text-indigo-500" />
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
          Adaptive Revision Engine
        </h1>
      </div>

      {/* Main Revision Control desk */}
      <div className="shrink-0 grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Left Side: Revision Modes selection (Spans 7) */}
        <div className="lg:col-span-7 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-primary)] mb-3">
            Select Revision Parameters
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <motion.div
              whileHover={{ scale: 1.008 }}
              whileTap={{ scale: 0.99 }}
              className={`border border-[var(--border-subtle)] rounded-xl p-3.5 cursor-pointer transition-colors flex justify-between items-start gap-2 ${mode === "mistakes" ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/15" : "bg-[var(--surface-secondary)]/50 hover:bg-[var(--surface-secondary)]"}`}
              onClick={() => setMode("mistakes")}
            >
              <div>
                <h4 className="font-bold text-sm text-[var(--text-primary)]">Mistakes Bank Queue</h4>
                <p className="text-[var(--text-muted)] text-xs font-medium mt-0.5">Flagged as incorrect during exams.</p>
              </div>
              <span className="shrink-0 bg-[var(--surface)] text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] shadow-sm text-indigo-500">
                {mistakes.filter(m => !m.mastered).length}
              </span>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.008 }}
              whileTap={{ scale: 0.99 }}
              className={`border border-[var(--border-subtle)] rounded-xl p-3.5 cursor-pointer transition-colors flex justify-between items-start gap-2 ${mode === "bookmarks" ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/15" : "bg-[var(--surface-secondary)]/50 hover:bg-[var(--surface-secondary)]"}`}
              onClick={() => setMode("bookmarks")}
            >
              <div>
                <h4 className="font-bold text-sm text-[var(--text-primary)]">Bookmarked Items</h4>
                <p className="text-[var(--text-muted)] text-xs font-medium mt-0.5">Bookmarks, folders, formula notes.</p>
              </div>
              <span className="shrink-0 bg-[var(--surface)] text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] shadow-sm text-indigo-500">
                {bookmarks.length}
              </span>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.008 }}
              whileTap={{ scale: 0.99 }}
              className={`border border-[var(--border-subtle)] rounded-xl p-3.5 cursor-pointer transition-colors flex justify-between items-start gap-2 ${mode === "weak_topics" ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/15" : "bg-[var(--surface-secondary)]/50 hover:bg-[var(--surface-secondary)]"}`}
              onClick={() => setMode("weak_topics")}
            >
              <div>
                <h4 className="font-bold text-sm text-[var(--text-primary)]">Weak Topics (&lt;50%)</h4>
                <p className="text-[var(--text-muted)] text-xs font-medium mt-0.5">Topics you scored poorly on.</p>
              </div>
              <span className="shrink-0 bg-[var(--surface)] text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] shadow-sm text-indigo-500">
                {weakTopics.length}
              </span>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.008 }}
              whileTap={{ scale: 0.99 }}
              className={`border border-[var(--border-subtle)] rounded-xl p-3.5 cursor-pointer transition-colors flex justify-between items-start gap-2 ${mode === "ai_insights" ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/15" : "bg-[var(--surface-secondary)]/50 hover:bg-[var(--surface-secondary)]"}`}
              onClick={() => setMode("ai_insights")}
            >
              <div>
                <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> AI Insights
                </h4>
                <p className="text-[var(--text-muted)] text-xs font-medium mt-0.5">Shortcuts &amp; sheets from AI.</p>
              </div>
              <span className="shrink-0 bg-[var(--surface)] text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] shadow-sm text-indigo-500">
                {bookmarks.filter(b => b.aiShortcut || b.personalObservations).length}
              </span>
            </motion.div>
          </div>

          <div className="pt-3 mt-3 border-t border-[var(--border-subtle)] flex justify-end">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleStartRevision}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase tracking-wider rounded-xl transition shadow-lg shadow-indigo-600/10 flex items-center gap-2 cursor-pointer text-xs"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Launch Revision Session</span>
            </motion.button>
          </div>
        </div>

        {/* Right Side: Quick Adaptive recommendations (Spans 5) */}
        <div className="lg:col-span-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-primary)] mb-3">
            Engine Suggestions
          </h3>

          {!loadingIntel && intel && (
            <div className="space-y-3">
              <div className="p-3.5 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Revision Due Today</span>
                  <span className="text-xs font-extrabold text-[var(--text-primary)] block mb-1">
                    {intel.todaysFocus.topic}
                  </span>
                  <p className="text-[10px] text-[var(--text-secondary)] font-semibold leading-relaxed">{intel.todaysFocus.reason}</p>
                </div>
              </div>

              <div className="p-3.5 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl flex items-start gap-3">
                <Clock className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Estimated Queue Review Time</span>
                  <span className="text-xs font-extrabold text-[var(--text-primary)] block mb-0.5">
                    {intel.revisionQueue.reduce((acc, q) => acc + q.estimatedTimeMin, 0)} Minutes
                  </span>
                  <p className="text-[10px] text-[var(--text-secondary)] font-semibold leading-relaxed">Required time to resolve all pending high-priority review tasks.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Reordered Revision Queue list — fills remaining space, scrolls internally */}
      <div className="flex-1 min-h-0 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="shrink-0 px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 flex justify-between items-center">
          <h3 className="font-extrabold text-xs uppercase tracking-widest text-[var(--text-primary)] flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <span>{mode === "ai_insights" ? "Saved AI Formulas & Shortcuts" : "Dynamic Revision Queue"}</span>
          </h3>
        </div>

          {mode === "ai_insights" ? (
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5">
              {bookmarks.filter(b => b.aiShortcut || b.personalObservations).length === 0 ? (
                <div className="p-12 text-center text-xs text-[var(--text-muted)] font-semibold flex flex-col items-center justify-center gap-3">
                  <Sparkles className="w-12 h-12 text-indigo-500 animate-pulse" />
                  <span>No AI tutor shortcuts or observations saved yet. Explain questions inside the AI Tutor to compile revision guides!</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bookmarks.filter(b => b.aiShortcut || b.personalObservations).map((b, idx) => (
                    <motion.div
                      key={b.questionId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                      className="bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] p-4 rounded-xl space-y-3 shadow-sm hover-lift"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">{b.subject}</span>
                        <button 
                          onClick={() => router.push(`/ai-tutor?qid=${b.questionId}`)}
                          className="text-[9px] font-black uppercase text-indigo-500 hover:underline cursor-pointer"
                        >
                          Open in Tutor
                        </button>
                      </div>
                      <h4 className="font-extrabold text-xs text-[var(--text-primary)]">{b.topic}</h4>
                      {b.aiShortcut && (
                        <div className="bg-[var(--surface)] border border-[var(--border-subtle)] p-3 rounded-lg">
                          <span className="text-[9px] font-black uppercase text-indigo-500 block mb-1">Saved Shortcut</span>
                          <div className="text-xs font-semibold text-[var(--text-secondary)] leading-relaxed">
                            <AstNodeRenderer nodes={AIResponseParser.parse(b.aiShortcut)} />
                          </div>
                        </div>
                      )}
                      {b.personalObservations && (
                        <div className="bg-[var(--surface)] border border-[var(--border-subtle)] p-3 rounded-lg">
                          <span className="text-[9px] font-black uppercase text-amber-500 block mb-1">Personal Observation</span>
                          <div className="text-xs font-semibold text-[var(--text-secondary)] leading-relaxed">
                            <AstNodeRenderer nodes={AIResponseParser.parse(b.personalObservations)} />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
              {!loadingIntel && intel && intel.revisionQueue.length > 0 ? (
                <table className="w-full text-xs text-left min-w-[700px]">
                  <thead className="text-[9px] font-black uppercase bg-[var(--surface-secondary)] text-[var(--text-muted)] border-b border-[var(--border-subtle)] sticky top-0 z-10">
                    <tr>
                      <th className="px-5 py-3.5">Topic Details</th>
                      <th className="px-5 py-3.5 text-center">Priority</th>
                      <th className="px-5 py-3.5">Revision Reason</th>
                      <th className="px-5 py-3.5 text-center">Est. Time</th>
                      <th className="px-5 py-3.5 text-center">Confidence</th>
                      <th className="px-5 py-3.5 text-center">Solved Counts</th>
                      <th className="px-5 py-3.5 text-right">Next suggested</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {intel.revisionQueue.map((item, idx) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                        className="hover:bg-[var(--surface-secondary)]/30 transition"
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-[var(--text-primary)] block text-xs truncate max-w-[180px]">{item.question.topic}</span>
                          <span className="text-[10px] text-[var(--text-muted)] font-semibold block truncate mt-0.5">{item.question.subject}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${priorityColor(item.priority)}`}>
                            {item.priority}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[11px] text-[var(--text-secondary)] font-semibold">{item.reason}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold font-mono text-[var(--text-secondary)]">
                          {item.estimatedTimeMin}m
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold font-mono text-[var(--text-secondary)]">
                          {item.confidencePercent}%
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold font-mono text-[var(--text-secondary)]">
                          {item.revisionCount} reviews
                        </td>
                        <td className="px-5 py-3.5 text-right text-[10px] font-bold text-[var(--text-muted)] font-mono">
                          {item.nextSuggestedRevision}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-xs text-[var(--text-muted)] font-semibold flex flex-col items-center justify-center gap-3">
                  <ShieldCheck className="w-12 h-12 text-emerald-500" />
                  <span>Your revision queue is empty! Great job mastering all mistakes.</span>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
    </MathJaxContext>
  );
}
