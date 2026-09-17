"use client";

import { motion } from "motion/react";
import { AlertCircle, Target, Sparkles, BookOpen, Clock, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

import { SubjectAnalytics, TopicAnalytics } from "@/types/analytics.types";
import { useMemo } from "react";

interface FocusCenterProps {
  subjectPerformance: SubjectAnalytics[];
  topicPerformance: TopicAnalytics[];
  mistakesCount: number;
  bookmarksCount: number;
  hasActiveSession: boolean;
  onContinueSession: () => void;
}

export function FocusCenter({
  subjectPerformance,
  topicPerformance,
  mistakesCount,
  bookmarksCount,
  hasActiveSession,
  onContinueSession
}: FocusCenterProps) {
  const router = useRouter();

  // Find weakest subject (worst accuracy with at least 2 attempts)
  const weakestSubject = useMemo(() => {
    const sorted = [...subjectPerformance]
      .filter(s => s.attempted >= 2)
      .map(s => ({
        ...s,
        acc: s.attempted > 0 ? (s.correct / s.attempted) * 100 : 0
      }))
      .sort((a, b) => a.acc - b.acc);
    return sorted[0] || null;
  }, [subjectPerformance]);

  // Find weakest topic (worst accuracy with at least 2 attempts)
  const weakestTopic = useMemo(() => {
    const sorted = [...topicPerformance]
      .filter(t => t.attempted >= 2)
      .map(t => ({
        ...t,
        acc: t.attempted > 0 ? (t.correct / t.attempted) * 100 : 0
      }))
      .sort((a, b) => a.acc - b.acc);
    return sorted[0] || null;
  }, [topicPerformance]);

  const focusCards = [
    ...(hasActiveSession ? [{
      title: "Continue Paused Exam",
      desc: "Finish your active quiz before it expires.",
      actionLabel: "Resume Now",
      icon: Clock,
      color: "border-blue-500/20 bg-blue-500/[0.02]",
      actionColor: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10",
      onClick: onContinueSession
    }] : []),
    ...(weakestTopic ? [{
      title: "Weakest Topic Diagnostic",
      desc: `Your accuracy in "${weakestTopic.topic}" is currently ${weakestTopic.acc.toFixed(0)}%.`,
      actionLabel: "Practice Topic",
      icon: AlertCircle,
      color: "border-rose-500/20 bg-rose-500/[0.02]",
      actionColor: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/10",
      onClick: () => router.push(`/setup?topic=${encodeURIComponent(weakestTopic.topic)}`)
    }] : []),
    ...(weakestSubject ? [{
      title: "Weakest Subject Revision",
      desc: `Your performance in "${weakestSubject.subject}" needs focus (${weakestSubject.acc.toFixed(0)}% acc).`,
      actionLabel: "Review Subject",
      icon: Target,
      color: "border-amber-500/20 bg-amber-500/[0.02]",
      actionColor: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/10",
      onClick: () => router.push(`/setup?subject=${encodeURIComponent(weakestSubject.subject)}`)
    }] : []),
    ...(mistakesCount > 0 ? [{
      title: "Review Mistakes Queue",
      desc: `You have ${mistakesCount} unresolved questions in your mistakes log.`,
      actionLabel: "Launch Mistakes",
      icon: BookOpen,
      color: "border-indigo-500/20 bg-indigo-500/[0.02]",
      actionColor: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/10",
      onClick: () => router.push("/mistakes")
    }] : []),
    {
      title: "Suggested Practice",
      desc: "Start a balanced 10-question quiz to test your overall readiness.",
      actionLabel: "Start Test",
      icon: Zap,
      color: "border-purple-500/20 bg-purple-500/[0.02]",
      actionColor: "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/10",
      onClick: () => router.push("/setup")
    }
  ].slice(0, 3); // Maximum 3 recommendation cards displayed at once to preserve layout clean flow

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
        <h3 className="font-extrabold text-xs uppercase tracking-widest text-[var(--text-muted)]">Today's Focus Desk</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {focusCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title + i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex flex-col justify-between p-5 border rounded-2xl shadow-sm relative overflow-hidden group ${card.color}`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.02] dark:bg-black/[0.02] rounded-bl-full pointer-events-none" />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-[var(--text-primary)] line-clamp-1">{card.title}</h4>
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed mb-6">{card.desc}</p>
              </div>

              <button
                onClick={card.onClick}
                className={`w-full py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] shadow transition cursor-pointer ${card.actionColor}`}
              >
                {card.actionLabel}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
