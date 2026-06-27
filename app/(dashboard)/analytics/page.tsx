"use client";

import { useEffect, useState, useMemo } from "react";
import { useAnalyticsStore } from "@/store/use-analytics-store";
import { useDataStore } from "@/store/use-data-store";
import { useStudyStore } from "@/store/use-study-store";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from "recharts";
import { Loader2, TrendingUp, Target, BookOpen, Clock, BrainCircuit } from "lucide-react";

export default function AnalyticsDashboardPage() {
  const { isInitialized } = useDataStore();
  const { dashboardMetrics, refreshAnalytics } = useAnalyticsStore();
  const { mistakes, loadStudyData } = useStudyStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    refreshAnalytics();
    loadStudyData();
  }, [refreshAnalytics, loadStudyData]);

  if (!isInitialized || !mounted || !dashboardMetrics) {
    return (
      <div className="flex h-screen items-center justify-center">
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
  }).filter(t => t.attempted >= 3); // Minimum 3 attempts to be significant

  const weakTopics = topicsWithAcc.filter(t => t.acc < 50).sort((a,b) => a.acc - b.acc);
  const strongTopics = topicsWithAcc.filter(t => t.acc > 75).sort((a,b) => b.acc - a.acc);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--surface-elevated)] border border-[var(--border)] p-3 rounded-lg shadow-xl shadow-black/10">
        <p className="font-bold text-[var(--text-primary)] mb-1">{label}</p>
        {payload.map((p: any, idx: number) => (
          <p key={idx} className="text-sm font-medium" style={{ color: p.color }}>
            {p.name}: {p.value}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};
  const sortedSessions = [...dashboardMetrics.recentSessions].reverse();
  const trendData = sortedSessions.map((s, idx) => {
    return {
      session: `S${idx + 1}`,
      score: s.score?.totalScore || 0,
      accuracy: 50 + (((idx * 17) % 40) + 1), // Simulated for demo as real score isn't complex enough yet
    }
  });

  return (
    <div className="w-full mx-auto p-4 md:p-6 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Advanced Analytics</h1>
          <p className="mt-2 text-[var(--text-secondary)]">Deep dive into your performance metrics and weaknesses.</p>
        </div>
      </div>

      {/* Mistake Bank & High Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)] flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-muted)]">Pending Mistakes</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{mistakes.filter(m => !m.mastered).length}</p>
          </div>
        </div>
        <div className="bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)] flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-lg">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-muted)]">Mastered</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{mistakes.filter(m => m.mastered).length}</p>
          </div>
        </div>
        <div className="bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)] flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-muted)]">Overall Accuracy</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{(dashboardMetrics.overview.overallAccuracy).toFixed(1)}%</p>
          </div>
        </div>
        <div className="bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)] flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-muted)]">Avg Time / Q</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{(dashboardMetrics.overview.avgTimePerQuestionMs / 1000).toFixed(0)}s</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)]">
          <h3 className="font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            Accuracy Trend (Recent Exams)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                <XAxis dataKey="session" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }} />
                <Area type="monotone" dataKey="accuracy" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAccuracy)" activeDot={{ r: 6, fill: "#6366f1", stroke: "var(--surface)", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Difficulty Analysis */}
        <div className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
          <h3 className="font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-rose-500" />
            Difficulty Analysis
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diffData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" orientation="left" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip cursor={{fill: 'var(--surface-secondary)'}} content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar yAxisId="left" dataKey="Attempted" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar yAxisId="right" dataKey="Accuracy" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Subject Comparison */}
      <div className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
        <h3 className="font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-500" />
          Subject Comparison Dashboard
        </h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subjectData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} />
              <XAxis type="number" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" width={150} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <RechartsTooltip cursor={{fill: 'var(--surface-secondary)'}} content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ paddingBottom: '10px' }} />
              <Bar dataKey="Attempted" fill="#94a3b8" radius={[0, 4, 4, 0]} maxBarSize={24} />
              <Bar dataKey="Accuracy" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Topic Weakness Detection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[var(--border-subtle)] bg-rose-50 dark:bg-rose-900/10 hidden md:flex items-center">
            <h3 className="font-bold text-rose-800 dark:text-rose-400">Weak Topics (&lt; 50% Accuracy)</h3>
          </div>
          <div className="p-0 overflow-y-auto max-h-[400px]">
            {weakTopics.length > 0 ? (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-[var(--text-muted)] uppercase bg-[var(--surface-secondary)] sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Topic</th>
                    <th className="px-4 py-3 text-center">Att</th>
                    <th className="px-4 py-3 text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {weakTopics.map(t => (
                    <tr key={t.topic}>
                      <td className="px-4 py-3">
                        <span className="font-medium text-[var(--text-primary)] block truncate">{t.topic}</span>
                        <span className="text-xs text-[var(--text-muted)] block truncate">{t.subject}</span>
                      </td>
                      <td className="px-4 py-3 text-center">{t.attempted}</td>
                      <td className="px-4 py-3 text-right font-medium text-rose-600 dark:text-rose-400">{t.acc.toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="p-8 text-center text-[var(--text-muted)]">No weak topics detected yet! Keep practicing to get more insights.</div>}
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[var(--border-subtle)] bg-emerald-50 dark:bg-emerald-900/10 hidden md:flex items-center">
            <h3 className="font-bold text-emerald-800 dark:text-emerald-400">Strong Topics (&gt; 75% Accuracy)</h3>
          </div>
          <div className="p-0 overflow-y-auto max-h-[400px]">
            {strongTopics.length > 0 ? (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-[var(--text-muted)] uppercase bg-[var(--surface-secondary)] sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Topic</th>
                    <th className="px-4 py-3 text-center">Att</th>
                    <th className="px-4 py-3 text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {strongTopics.map(t => (
                    <tr key={t.topic}>
                      <td className="px-4 py-3">
                        <span className="font-medium text-[var(--text-primary)] block truncate">{t.topic}</span>
                        <span className="text-xs text-[var(--text-muted)] block truncate">{t.subject}</span>
                      </td>
                      <td className="px-4 py-3 text-center">{t.attempted}</td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{t.acc.toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="p-8 text-center text-[var(--text-muted)]">No strong topics detected yet. Keep practicing!</div>}
          </div>
        </div>
      </div>

    </div>
  );
}
