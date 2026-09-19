"use client";

import { useEffect, useState, useMemo } from "react";
import { useAnalyticsStore } from "@/store/use-analytics-store";
import { useDataStore } from "@/store/use-data-store";
import { useStudyStore } from "@/store/use-study-store";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from "recharts";
import { 
  Loader2, TrendingUp, Target, BookOpen, Clock, BrainCircuit, 
  Sparkles, Flame, CheckCircle, Lightbulb, Compass, Award 
} from "lucide-react";
import { LearningEngine, PersonalizedIntelligence } from "@/lib/learning/LearningEngine";
import { motion } from "motion/react";

export default function AnalyticsDashboardPage() {
  const { isInitialized } = useDataStore();
  const { dashboardMetrics, loadAnalytics } = useAnalyticsStore();
  const { mistakes, loadStudyData } = useStudyStore();

  const [mounted, setMounted] = useState(false);
  const [intel, setIntel] = useState<PersonalizedIntelligence | null>(null);
  const [loadingIntel, setLoadingIntel] = useState(true);

  useEffect(() => {
    setMounted(true);
    // Cached — recomputes only when missing or explicitly invalidated (e.g. after
    // submitting an exam), instead of on every single navigation to this page.
    loadAnalytics();
    loadStudyData();

    // Fetch Personalized Intelligence from Adaptive Learning Engine
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
  }, [loadAnalytics, loadStudyData]);

  if (!isInitialized || !mounted || !dashboardMetrics) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Derived Difficulty Data
  const diffData = dashboardMetrics.difficultyPerformance.map(d => ({
    name: d.difficulty,
    Attempted: d.attempted,
    Correct: d.correct,
    Accuracy: d.attempted > 0 ? Number(((d.correct / d.attempted) * 100).toFixed(0)) : 0
  }));

  // Derived Subject Data
  const subjectData = dashboardMetrics.subjectPerformance.map(s => ({
    name: s.subject.length > 15 ? s.subject.substring(0, 15) + "..." : s.subject,
    Attempted: s.attempted,
    Accuracy: s.attempted > 0 ? Number(((s.correct / s.attempted) * 100).toFixed(0)) : 0,
    AvgTimeSec: s.attempted > 0 ? Number((s.timeSpentMs / s.attempted / 1000).toFixed(0)) : 0
  }));

  // Topic Weakness Detection
  const topicsWithAcc = dashboardMetrics.topicPerformance.map(t => {
    const acc = t.attempted > 0 ? (t.correct / t.attempted) * 100 : 0;
    return { ...t, acc };
  }).filter(t => t.attempted >= 1); // Touched at least once

  const weakTopics = topicsWithAcc.filter(t => t.acc < 50).sort((a,b) => a.acc - b.acc);
  const strongTopics = topicsWithAcc.filter(t => t.acc >= 75).sort((a,b) => b.acc - a.acc);

  const ChartEmptyState = ({ label }: { label: string }) => (
    <div className="h-full w-full flex flex-col items-center justify-center text-center gap-2">
      <TrendingUp className="w-8 h-8 text-[var(--text-muted)] opacity-40" />
      <p className="text-xs font-bold text-[var(--text-secondary)]">No data yet</p>
      <p className="text-[11px] text-[var(--text-muted)] max-w-[220px]">{label}</p>
    </div>
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--surface-elevated)] border border-[var(--border)] p-3 rounded-xl shadow-xl">
          <p className="font-bold text-[var(--text-primary)] mb-1 text-xs">{label}</p>
          {payload.map((p: any, idx: number) => (
            <p key={idx} className="text-xs font-semibold" style={{ color: p.color }}>
              {p.name}: {p.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const sortedSessions = [...dashboardMetrics.recentSessions].filter(s => s.status === "SUBMITTED").reverse();
  const trendData = sortedSessions.map((s, idx) => {
    return {
      session: `S${idx + 1}`,
      score: s.score?.totalScore || 0,
      accuracy: s.accuracy || 0,
    };
  });

  return (
    <div className="w-full mx-auto p-4 md:p-6 space-y-8 bg-[var(--background)] font-sans">
      
      {/* Page Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex justify-between items-end"
      >
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-indigo-500" />
            <span>Advanced Analytics</span>
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] font-semibold">
            Observe learning metrics, weak points, and adaptive recommendations.
          </p>
        </div>
      </motion.div>

      {/* 1. Personalized Intelligence HUD (Part 1) */}
      {!loadingIntel && intel && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Mastery Score", value: intel.masteryScore, icon: CheckCircle, tag: "Core CSE", badge: "bg-indigo-500/10", color: "text-indigo-500", glow: "bg-indigo-500" },
            { label: "Readiness Index", value: intel.readinessScore, icon: Award, tag: "Exam Ready", badge: "bg-emerald-500/10", color: "text-emerald-500", glow: "bg-emerald-500" },
            { label: "Confidence Level", value: intel.confidenceScore, icon: Sparkles, tag: "Accuracy/Speed", badge: "bg-amber-500/10", color: "text-amber-500", glow: "bg-amber-500" },
            { label: "Learning Consistency", value: intel.consistencyScore, icon: Flame, tag: "Active Days", badge: "bg-rose-500/10", color: "text-rose-500", glow: "bg-rose-500", fillIcon: true },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + idx * 0.05 }}
              className="relative bg-[var(--surface)] p-5 border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden hover-lift group"
            >
              <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-[0.15] ${stat.glow} pointer-events-none group-hover:opacity-25 transition-opacity`} />
              <div className={`relative w-9 h-9 rounded-xl ${stat.badge} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-4.5 h-4.5 ${stat.color} ${stat.fillIcon ? "fill-rose-500 stroke-none" : ""}`} />
              </div>
              <span className="relative block text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">{stat.label}</span>
              <div className="relative flex items-end gap-2">
                <span className="text-3xl font-black text-[var(--text-primary)] font-mono tracking-tight">{stat.value}%</span>
                <span className={`text-[10px] font-extrabold ${stat.color} mb-1`}>{stat.tag}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 2. Smart Insights Panel & Today's Adaptive Focus (Part 3) */}
      {!loadingIntel && intel && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Smart Insights Feed */}
          <div className="lg:col-span-8 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-widest text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Smart Insights Feed</span>
              </h3>
              
              <div className="space-y-3.5">
                {intel.insights.map((insight, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.3) }}
                    className="flex gap-3 items-start p-3 bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] rounded-xl"
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                    <p className="text-xs font-semibold leading-relaxed text-[var(--text-secondary)]">{insight}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Today's Adaptive Recommendations */}
          <div className="lg:col-span-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-5">
              <h3 className="font-extrabold text-sm uppercase tracking-widest text-[var(--text-primary)] flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-500" />
                <span>Today's Adaptive Path</span>
              </h3>

              <div className="space-y-4">
                {/* Focus topic card */}
                <div className="p-4 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl">
                  <span className="block text-[8px] font-black uppercase tracking-widest text-indigo-500 mb-1">Recommended Focus Topic</span>
                  <span className="block text-xs font-bold text-[var(--text-primary)] mb-1">{intel.todaysFocus.topic}</span>
                  <p className="text-[10px] text-[var(--text-muted)] font-semibold leading-relaxed">{intel.todaysFocus.reason}</p>
                </div>

                {/* Target count card */}
                <div className="p-4 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl">
                  <span className="block text-[8px] font-black uppercase tracking-widest text-emerald-500 mb-1">Practice Target</span>
                  <span className="block text-xs font-bold text-[var(--text-primary)] mb-1">{intel.todaysTarget.title} ({intel.todaysTarget.count} Qs)</span>
                  <p className="text-[10px] text-[var(--text-muted)] font-semibold leading-relaxed">{intel.todaysTarget.reason}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts HUD Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] shadow-sm"
        >
          <h3 className="font-extrabold text-xs uppercase tracking-widest text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            Accuracy Trend (Recent Exams)
          </h3>
          <div className="h-[300px] w-full">
            {trendData.length === 0 ? (
              <ChartEmptyState label="Complete a mock test to start tracking your accuracy trend across exams." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                  <XAxis dataKey="session" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }} />
                  <Area type="monotone" dataKey="accuracy" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAccuracy)" activeDot={{ r: 6, fill: "#6366f1", stroke: "var(--surface)", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Difficulty Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] shadow-sm"
        >
          <h3 className="font-extrabold text-xs uppercase tracking-widest text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <Target className="w-4 h-4 text-rose-500" />
            Difficulty Analysis
          </h3>
          <div className="h-[300px] w-full">
            {diffData.length === 0 ? (
              <ChartEmptyState label="Difficulty-wise performance will appear once you attempt questions across difficulty levels." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={diffData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" orientation="left" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <RechartsTooltip cursor={{fill: 'var(--surface-secondary)'}} content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px' }} />
                  <Bar yAxisId="left" dataKey="Attempted" name="Questions Solved" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar yAxisId="right" dataKey="Accuracy" name="Accuracy %" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      {/* Time Efficiency Dashboard — the per-subject average time-per-question was
          already being computed (AvgTimeSec, above) but never actually rendered anywhere;
          this is real signal (GATE scoring assumes 108s/1-mark, 216s/2-mark) that was
          being thrown away. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] shadow-sm"
      >
        <h3 className="font-extrabold text-xs uppercase tracking-widest text-[var(--text-primary)] mb-1 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          Time Efficiency by Subject
        </h3>
        <p className="text-[10px] text-[var(--text-muted)] font-semibold mb-5">Average seconds spent per question — GATE pacing assumes ~108s for 1-mark, ~216s for 2-mark questions.</p>
        <div className="h-[260px] w-full">
          {subjectData.length === 0 ? (
            <ChartEmptyState label="Time-per-question data will appear once you complete a timed mock test." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <RechartsTooltip cursor={{fill: 'var(--surface-secondary)'}} content={({ active, payload, label }: any) => active && payload?.length ? (
                  <div className="bg-[var(--surface-elevated)] border border-[var(--border)] p-3 rounded-xl shadow-xl">
                    <p className="font-bold text-[var(--text-primary)] mb-1 text-xs">{label}</p>
                    <p className="text-xs font-semibold" style={{ color: payload[0].color }}>Avg Time: {payload[0].value}s / question</p>
                  </div>
                ) : null} />
                <Bar dataKey="AvgTimeSec" name="Avg Seconds / Question" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* Subject Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] shadow-sm"
      >
        <h3 className="font-extrabold text-xs uppercase tracking-widest text-[var(--text-primary)] mb-6 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-500" />
          Subject Comparison Dashboard
        </h3>
        <div className="h-[320px] w-full">
          {subjectData.length === 0 ? (
            <ChartEmptyState label="Subject-wise comparisons will appear once you complete a mock test or subject-wise practice." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" width={110} stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} />
                <RechartsTooltip cursor={{fill: 'var(--surface-secondary)'}} content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingBottom: '10px', fontSize: '10px' }} />
                <Bar dataKey="Attempted" name="Attempts" fill="#94a3b8" radius={[0, 4, 4, 0]} maxBarSize={16} />
                <Bar dataKey="Accuracy" name="Accuracy %" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* Weak & Strong Topics table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weak Topics */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden flex flex-col"
        >
          <div className="px-5 py-4 border-b border-[var(--border-subtle)] bg-rose-500/10 flex items-center">
            <h3 className="font-extrabold text-xs uppercase tracking-widest text-rose-600 dark:text-rose-400">Weak Topics (&lt; 50% Accuracy)</h3>
          </div>
          <div className="overflow-y-auto max-h-[350px] custom-scrollbar">
            {weakTopics.length > 0 ? (
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] font-black uppercase bg-[var(--surface-secondary)] text-[var(--text-muted)] sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Topic</th>
                    <th className="px-4 py-3 text-center">Attempts</th>
                    <th className="px-4 py-3 text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {weakTopics.map((t, idx) => (
                    <motion.tr
                      key={t.topic}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                    >
                      <td className="px-4 py-3">
                        <span className="font-bold text-[var(--text-primary)] block truncate">{t.topic}</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-semibold block truncate mt-0.5">{t.subject}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold font-mono text-[var(--text-secondary)]">{t.attempted}</td>
                      <td className="px-4 py-3 text-right font-black text-rose-600 dark:text-rose-400 font-mono">{t.acc.toFixed(0)}%</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-xs text-[var(--text-muted)] font-semibold">
                No weak topics detected yet! Solve more questions to build insights.
              </div>
            )}
          </div>
        </motion.div>

        {/* Strong Topics */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden flex flex-col"
        >
          <div className="px-5 py-4 border-b border-[var(--border-subtle)] bg-emerald-500/10 flex items-center">
            <h3 className="font-extrabold text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Strong Topics (&gt; 75% Accuracy)</h3>
          </div>
          <div className="overflow-y-auto max-h-[350px] custom-scrollbar">
            {strongTopics.length > 0 ? (
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] font-black uppercase bg-[var(--surface-secondary)] text-[var(--text-muted)] sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Topic</th>
                    <th className="px-4 py-3 text-center">Attempts</th>
                    <th className="px-4 py-3 text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {strongTopics.map((t, idx) => (
                    <motion.tr
                      key={t.topic}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                    >
                      <td className="px-4 py-3">
                        <span className="font-bold text-[var(--text-primary)] block truncate">{t.topic}</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-semibold block truncate mt-0.5">{t.subject}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold font-mono text-[var(--text-secondary)]">{t.attempted}</td>
                      <td className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono">{t.acc.toFixed(0)}%</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-xs text-[var(--text-muted)] font-semibold">
                No strong topics detected yet. Keep practicing!
              </div>
            )}
          </div>
        </motion.div>
      </div>

    </div>
  );
}
