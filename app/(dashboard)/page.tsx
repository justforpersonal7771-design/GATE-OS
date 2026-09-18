"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDataStore } from "@/store/use-data-store";
import { useExamRuntimeStore } from "@/store/use-exam-runtime-store";
import { useAnalyticsStore } from "@/store/use-analytics-store";
import { useStudyStore } from "@/store/use-study-store";
import { IDBManager } from "@/lib/repository/storage/idb-manager";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "motion/react";
import {
  Target, Clock, Flame, Loader2, TrendingUp
} from "lucide-react";

// Dynamic imports with Skeleton Loading placeholders to guarantee performance (Part 12)
const HeroSection = dynamic(() => import("@/components/dashboard/hero-section").then(m => m.HeroSection), {
  ssr: false,
  loading: () => <div className="skeleton-shimmer h-64 rounded-3xl" />
});

const QuickActions = dynamic(() => import("@/components/dashboard/quick-actions").then(m => m.QuickActions), {
  ssr: false,
  loading: () => <div className="skeleton-shimmer h-32 rounded-2xl" />
});

const ProgressVisualizer = dynamic(() => import("@/components/dashboard/progress-visualizer").then(m => m.ProgressVisualizer), {
  ssr: false,
  loading: () => <div className="skeleton-shimmer h-64 rounded-2xl" />
});

const FocusCenter = dynamic(() => import("@/components/dashboard/focus-center").then(m => m.FocusCenter), {
  ssr: false,
  loading: () => <div className="skeleton-shimmer h-48 rounded-2xl" />
});

const GithubHeatmap = dynamic(() => import("@/components/dashboard/github-heatmap").then(m => m.GithubHeatmap), {
  ssr: false,
  loading: () => <div className="skeleton-shimmer h-32 rounded-2xl" />
});

const ActivityTimeline = dynamic(() => import("@/components/dashboard/activity-timeline").then(m => m.ActivityTimeline), {
  ssr: false,
  loading: () => <div className="skeleton-shimmer h-[400px] rounded-2xl" />
});

const RecentExams = dynamic(() => import("@/components/dashboard/recent-exams").then(m => m.RecentExams), {
  ssr: false,
  loading: () => <div className="skeleton-shimmer h-[380px] rounded-2xl" />
});

export default function Home() {
  const router = useRouter();
  const { loadRepository, isInitialized } = useDataStore();
  const { activeSession, isHydrated, initializeStore, clearSession } = useExamRuntimeStore();
  const { dashboardMetrics, loadAnalytics, loading } = useAnalyticsStore();
  const { bookmarks, mistakes, loadStudyData } = useStudyStore();
  
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [mistakesCount, setMistakesCount] = useState(0);

  useEffect(() => {
    loadRepository();
    loadStudyData();
    if (!isHydrated) {
      initializeStore();
    }
    
    // Fetch count details for stats cards
    IDBManager.getAllBookmarks().then(b => setBookmarksCount(b.length)).catch(()=>null);
    IDBManager.getAllMistakes().then(m => setMistakesCount(m.length)).catch(()=>null);
  }, [loadRepository, initializeStore, isHydrated, loadStudyData]);

  useEffect(() => {
    if (isInitialized) {
      const { refreshAnalytics } = useAnalyticsStore.getState();
      refreshAnalytics();
    }
  }, [isInitialized]);

  const overview = dashboardMetrics?.overview;
  const snapshots = useAnalyticsStore(state => state.snapshots);

  // Resume or start exam handlers
  const handleResume = () => {
    router.push("/exam/session");
  };

  const handleNewExam = () => {
    router.push("/setup");
  };

  // Past sessions only retain a lightweight summary (id/status/score), not the
  // original ExamSessionDraft, so "practicing again" can't silently replay the
  // exact same paper — send the student to Setup to configure a fresh one
  // instead of spreading a nonexistent draftConfig into a broken session.
  const handleRetryExam = () => {
    router.push("/setup");
  };

  if (!isInitialized || (loading && !dashboardMetrics)) {
    return (
      <div className="flex h-[80vh] w-full flex-col items-center justify-center bg-[var(--background)]">
         <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
         <span className="font-extrabold tracking-widest text-xs text-[var(--text-muted)] uppercase animate-pulse">Initializing Dashboard...</span>
      </div>
    );
  }

  // Premium metrics definition (Part 7)
  const accuracyValue = overview?.overallAccuracy || 0;
  const solvedCount = overview?.totalQuestionsSolved || 0;
  const studyHours = overview?.totalTimeSpentMs ? Math.round(overview.totalTimeSpentMs / 1000 / 3600) : 0;
  const streakDays = overview?.currentStreak || 0;

  return (
    <div className="w-full mx-auto p-4 md:p-6 lg:p-8 space-y-8 bg-[var(--background)] min-h-screen">
      
      {/* 1. Hero Section Banner */}
      <HeroSection 
        streak={streakDays}
        solved={solvedCount}
        accuracy={accuracyValue}
        onNewExam={handleNewExam}
      />

      {/* 2. Active Session Banner Alert */}
      <AnimatePresence>
      {isHydrated && activeSession && activeSession.status !== "SUBMITTED" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="p-5 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="flex gap-4 items-center relative z-10">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-indigo-950 dark:text-indigo-300 mb-0.5">Mock session is paused in background</h2>
              <p className="text-[var(--text-muted)] text-xs font-semibold">You paused an active exam. You can resume your test now.</p>
            </div>
          </div>
          <div className="flex gap-3 shrink-0 w-full sm:w-auto relative z-10">
            <button
              onClick={handleResume}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow transition-colors flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              Resume Exam
            </button>
            <button
              onClick={async () => {
                if (confirm("Discard this exam session? All progress will be lost.")) {
                  await clearSession();
                }
              }}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] rounded-xl font-bold transition cursor-pointer text-xs"
            >
              Discard
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* 3. Premium Analytics Metrics Row Grid (Part 7) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Practice Accuracy", value: `${accuracyValue.toFixed(1)}%`, icon: TrendingUp, badge: "bg-emerald-500/10", iconColor: "text-emerald-500", glow: "bg-emerald-500" },
          { label: "Questions Solved", value: solvedCount, icon: Target, badge: "bg-indigo-500/10", iconColor: "text-indigo-500", glow: "bg-indigo-500" },
          { label: "Study Hours", value: `${studyHours} hrs`, icon: Clock, badge: "bg-amber-500/10", iconColor: "text-amber-500", glow: "bg-amber-500" },
          { label: "Active Streak", value: `${streakDays} days`, icon: Flame, badge: "bg-rose-500/10", iconColor: "text-rose-500 fill-rose-500 stroke-none", glow: "bg-rose-500" },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + idx * 0.05 }}
            className="relative bg-[var(--surface)] border border-[var(--border)] p-5 rounded-2xl shadow-sm overflow-hidden group hover-lift"
          >
            <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-[0.15] ${stat.glow} pointer-events-none group-hover:opacity-25 transition-opacity`} />
            <div className={`relative w-10 h-10 rounded-xl ${stat.badge} flex items-center justify-center mb-4`}>
              <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
            </div>
            <div className="relative text-3xl font-black text-[var(--text-primary)] font-mono tracking-tight">{stat.value}</div>
            <div className="relative text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1.5">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* 4. Main Two-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Side (Spans 8 columns) */}
        <div className="lg:col-span-8 space-y-8 flex flex-col justify-start">
          {/* Quick Actions Panel */}
          <QuickActions 
            hasActiveSession={!!activeSession && activeSession.status !== "SUBMITTED"}
            onResume={handleResume}
          />

          {/* Progress Circular and Mastery Rings */}
          <ProgressVisualizer 
            subjectPerformance={dashboardMetrics?.subjectPerformance || []}
            totalSolved={solvedCount}
          />

          {/* Today's Focus Widget */}
          <FocusCenter 
            subjectPerformance={dashboardMetrics?.subjectPerformance || []}
            topicPerformance={dashboardMetrics?.topicPerformance || []}
            mistakesCount={mistakesCount}
            bookmarksCount={bookmarksCount}
            hasActiveSession={!!activeSession && activeSession.status !== "SUBMITTED"}
            onContinueSession={handleResume}
          />
        </div>

        {/* Right Side (Spans 4 columns) */}
        <div className="lg:col-span-4 space-y-8 flex flex-col justify-start">
          {/* Contribution Heatmap */}
          <GithubHeatmap 
            snapshots={snapshots}
          />

          {/* Recent Exam logs */}
          <RecentExams 
            recentSessions={dashboardMetrics?.recentSessions || []}
            onRetry={handleRetryExam}
          />

          {/* Activity timeline logs */}
          <ActivityTimeline 
            recentSessions={dashboardMetrics?.recentSessions || []}
            bookmarks={bookmarks}
            mistakes={mistakes}
          />
        </div>

      </div>

    </div>
  );
}
