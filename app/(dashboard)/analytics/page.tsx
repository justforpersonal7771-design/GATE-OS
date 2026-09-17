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

export default function AnalyticsDashboardPage() {
  const { isInitialized } = useDataStore();
  const { dashboardMetrics, refreshAnalytics } = useAnalyticsStore();
  const { mistakes, loadStudyData } = useStudyStore();

  const [mounted, setMounted] = useState(false);
  const [intel, setIntel] = useState<PersonalizedIntelligence | null>(null);
  const [loadingIntel, setLoadingIntel] = useState(true);

  useEffect(() => {
    setMounted(true);
    refreshAnalytics();
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
  }, [refreshAnalytics, loadStudyData]);

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
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-indigo-500" />
            <span>Advanced Analytics</span>
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] font-semibold">
            Observe learning metrics, weak points, and adaptive recommendations.
          </p>
        </div>
      </div>

      {/* 1. Personalized Intelligence HUD (Part 1) */}
      {!loadingIntel && intel && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Mastery Hud */}
          <div className="bg-[var(--surface)] p-5 border border-[var(--border)] rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500" />
            <span className="block text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Mastery Score</span>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-[var(--text-primary)] font-mono">{intel.masteryScore}%</span>
              <span className="text-[10px] font-extrabold text-indigo-500 mb-1 flex items-center gap-0.5">
                <CheckCircle className="w-3.5 h-3.5" /> Core CSE
              </span>
            </div>
          </div>

          {/* Readiness Score Hud */}
          <div className="bg-[var(--surface)] p-5 border border-[var(--border)] rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
            <span className="block text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Readiness Index</span>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-[var(--text-primary)] font-mono">{intel.readinessScore}%</span>
              <span className="text-[10px] font-extrabold text-emerald-500 mb-1 flex items-center gap-0.5">
                <Award className="w-3.5 h-3.5" /> Exam Ready
              </span>
            </div>
          </div>

          {/* Confidence Score Hud */}
          <div className="bg-[var(--surface)] p-5 border border-[var(--border)] rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
            <span className="block text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Confidence Level</span>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-[var(--text-primary)] font-mono">{intel.confidenceScore}%</span>
              <span className="text-[10px] font-extrabold text-amber-500 mb-1 flex items-center gap-0.5">
                <Sparkles className="w-3.5 h-3.5" /> Accuracy/Speed
              </span>
            </div>
          </div>

          {/* Study Momentum Hud */}
          <div className="bg-[var(--surface)] p-5 border border-[var(--border)] rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500" />
            <span className="block text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Learning Consistency</span>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-[var(--text-primary)] font-mono">{intel.consistencyScore}%</span>
              <span className="text-[10px] font-extrabold text-rose-500 mb-1 flex items-center gap-0.5">
                <Flame className="w-3.5 h-3.5 fill-rose-500 stroke-none" /> Active Days
              </span>
            </div>
          </div>
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
                  <div key={idx} className="flex gap-3 items-start p-3 bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                    <p className="text-xs font-semibold leading-relaxed text-[var(--text-secondary)]">{insight}</p>
                  </div>
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
        <div className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
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
        </div>

        {/* Difficulty Analysis */}
        <div className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
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
        </div>
      </div>

      {/* Subject Dashboard */}
      <div className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
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
      </div>

      {/* Weak & Strong Topics table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weak Topics */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden flex flex-col">
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
                  {weakTopics.map(t => (
                    <tr key={t.topic}>
                      <td className="px-4 py-3">
                        <span className="font-bold text-[var(--text-primary)] block truncate">{t.topic}</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-semibold block truncate mt-0.5">{t.subject}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold font-mono text-[var(--text-secondary)]">{t.attempted}</td>
                      <td className="px-4 py-3 text-right font-black text-rose-600 dark:text-rose-400 font-mono">{t.acc.toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-xs text-[var(--text-muted)] font-semibold">
                No weak topics detected yet! Solve more questions to build insights.
              </div>
            )}
          </div>
        </div>

        {/* Strong Topics */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden flex flex-col">
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
                  {strongTopics.map(t => (
                    <tr key={t.topic}>
                      <td className="px-4 py-3">
                        <span className="font-bold text-[var(--text-primary)] block truncate">{t.topic}</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-semibold block truncate mt-0.5">{t.subject}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold font-mono text-[var(--text-secondary)]">{t.attempted}</td>
                      <td className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono">{t.acc.toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-xs text-[var(--text-muted)] font-semibold">
                No strong topics detected yet. Keep practicing!
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
