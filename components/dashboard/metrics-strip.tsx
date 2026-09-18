"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  Clock, AlertTriangle, TrendingUp as TrendingUpIcon, ClipboardList,
  CheckCircle2, Bookmark, Flame, Timer, Sparkles, Target as TargetIcon,
} from "lucide-react";

interface MetricsStripProps {
  studyHours: number;
  bookmarksCount: number;
  bestStreak: number;
  avgTimePerQuestion: number;
  weakTopicsCount: number;
  strongTopicsCount: number;
  pendingMistakesCount: number;
  masteredMistakesCount: number;
}

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = progress * (2 - progress);
      setValue(target * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

interface Accent {
  text: string;
  bg: string;
  glow: string;
}

function MiniStat({
  icon: Icon, label, value, suffix = "", accent, href, delay,
}: {
  icon: any; label: string; value: number; suffix?: string; accent: Accent; href: string; delay: number;
}) {
  const router = useRouter();
  const animated = useCountUp(value);

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 260, damping: 22 }}
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push(href)}
      className="relative flex-1 min-w-[100px] p-3.5 rounded-xl bg-[var(--surface-secondary)]/50 hover:bg-[var(--surface-secondary)] border border-transparent hover:border-[var(--border-subtle)] transition-colors text-left cursor-pointer group overflow-hidden"
    >
      <span
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${accent.glow} blur-2xl pointer-events-none`}
      />
      <div className="relative flex items-center gap-2 mb-2">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${accent.bg} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>
          <Icon className={`w-3.5 h-3.5 ${accent.text}`} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
      </div>
      <div className="relative text-xl font-black text-[var(--text-primary)] font-mono tracking-tight">
        {Math.round(animated)}{suffix}
      </div>
    </motion.button>
  );
}

function ComparativeBar({
  leftValue, leftColor, rightValue, rightColor,
}: {
  leftValue: number; leftColor: string; rightValue: number; rightColor: string;
}) {
  const total = leftValue + rightValue;
  const leftPct = total > 0 ? (leftValue / total) * 100 : 50;

  return (
    <div className="h-1.5 w-full rounded-full bg-[var(--surface-secondary)] overflow-hidden flex">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${leftPct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`h-full ${leftColor}`}
      />
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${100 - leftPct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`h-full ${rightColor}`}
      />
    </div>
  );
}

export function MetricsStrip({
  studyHours, bookmarksCount, bestStreak, avgTimePerQuestion,
  weakTopicsCount, strongTopicsCount, pendingMistakesCount, masteredMistakesCount,
}: MetricsStripProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Study Momentum */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-3 px-0.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm shadow-indigo-500/30">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wide">Study Momentum</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <MiniStat icon={Clock} label="Study Hours" value={studyHours} suffix="h" href="/analytics" delay={0.05}
            accent={{ text: "text-amber-500", bg: "bg-amber-500/10", glow: "from-amber-500/20 to-transparent" }} />
          <MiniStat icon={Bookmark} label="Bookmarks" value={bookmarksCount} href="/bookmarks" delay={0.1}
            accent={{ text: "text-indigo-500", bg: "bg-indigo-500/10", glow: "from-indigo-500/20 to-transparent" }} />
          <MiniStat icon={Flame} label="Best Streak" value={bestStreak} suffix="d" href="/analytics" delay={0.15}
            accent={{ text: "text-pink-500", bg: "bg-pink-500/10", glow: "from-pink-500/20 to-transparent" }} />
          <MiniStat icon={Timer} label="Avg Time/Q" value={avgTimePerQuestion} suffix="s" href="/analytics" delay={0.2}
            accent={{ text: "text-sky-500", bg: "bg-sky-500/10", glow: "from-sky-500/20 to-transparent" }} />
        </div>
      </motion.div>

      {/* Performance Signals */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-3 px-0.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-sm shadow-rose-500/30">
            <TargetIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wide">Performance Signals</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <MiniStat icon={AlertTriangle} label="Weak Topics" value={weakTopicsCount} href="/analytics" delay={0.1}
            accent={{ text: "text-orange-500", bg: "bg-orange-500/10", glow: "from-orange-500/20 to-transparent" }} />
          <MiniStat icon={TrendingUpIcon} label="Strong Topics" value={strongTopicsCount} href="/analytics" delay={0.15}
            accent={{ text: "text-teal-500", bg: "bg-teal-500/10", glow: "from-teal-500/20 to-transparent" }} />
          <MiniStat icon={ClipboardList} label="Pending Mistakes" value={pendingMistakesCount} href="/mistakes" delay={0.2}
            accent={{ text: "text-rose-500", bg: "bg-rose-500/10", glow: "from-rose-500/20 to-transparent" }} />
          <MiniStat icon={CheckCircle2} label="Mastered" value={masteredMistakesCount} href="/mistakes" delay={0.25}
            accent={{ text: "text-emerald-500", bg: "bg-emerald-500/10", glow: "from-emerald-500/20 to-transparent" }} />
        </div>

        {weakTopicsCount + strongTopicsCount > 0 && (
          <div className="mt-3 px-0.5 space-y-1">
            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wide text-[var(--text-muted)]">
              <span>Topic Health</span>
              <span>
                <span className="text-orange-500">{weakTopicsCount} weak</span>
                {" · "}
                <span className="text-teal-500">{strongTopicsCount} strong</span>
              </span>
            </div>
            <ComparativeBar leftValue={weakTopicsCount} leftColor="bg-orange-500" rightValue={strongTopicsCount} rightColor="bg-teal-500" />
          </div>
        )}
      </motion.div>
    </div>
  );
}
