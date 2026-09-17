"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Bookmark, AlertCircle, PlayCircle, Activity } from "lucide-react";
import { BookmarkEntry, MistakeEntry } from "@/types/study.types";
import { RecentSessionSummary } from "@/types/analytics.types";

interface ActivityTimelineProps {
  recentSessions: RecentSessionSummary[];
  bookmarks: BookmarkEntry[];
  mistakes: MistakeEntry[];
}

interface TimelineEvent {
  id: string;
  type: "exam" | "bookmark" | "mistake";
  title: string;
  timestamp: Date;
  meta: string;
  status?: string;
}

export function ActivityTimeline({ recentSessions, bookmarks, mistakes }: ActivityTimelineProps) {
  const groupedEvents = useMemo(() => {
    const events: TimelineEvent[] = [];

    // Map Exams
    recentSessions.forEach(s => {
      events.push({
        id: s.id,
        type: "exam",
        title: s.config.name || "GATE Mock Test",
        timestamp: new Date(s.updatedAt || s.startedAt || Date.now()),
        meta: s.status === "SUBMITTED" ? `Accuracy: ${s.accuracy.toFixed(0)}%` : "Practice Session",
        status: s.status
      });
    });

    // Map Bookmarks
    bookmarks.slice(0, 15).forEach(b => {
      events.push({
        id: `bookmark-${b.questionId}-${b.createdAt}`,
        type: "bookmark",
        title: "Bookmark Added",
        timestamp: new Date(b.createdAt),
        meta: `${b.subject} / ${b.topic}`
      });
    });

    // Map Mistakes
    mistakes.slice(0, 15).forEach(m => {
      events.push({
        id: `mistake-${m.questionId}-${m.firstSeen}`,
        type: "mistake",
        title: m.mastered ? "Mistake Resolved" : "Logged Practice Mistake",
        timestamp: new Date(m.firstSeen),
        meta: `${m.subject} / ${m.topic}`
      });
    });

    // Sort descending by timestamp
    const sorted = events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);

    // Group by Today, Yesterday, Earlier
    const today: TimelineEvent[] = [];
    const yesterday: TimelineEvent[] = [];
    const earlier: TimelineEvent[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    sorted.forEach(e => {
      const t = e.timestamp.getTime();
      if (t >= startOfToday) today.push(e);
      else if (t >= startOfYesterday) yesterday.push(e);
      else earlier.push(e);
    });

    return [
      ...(today.length > 0 ? [{ label: "Today", items: today }] : []),
      ...(yesterday.length > 0 ? [{ label: "Yesterday", items: yesterday }] : []),
      ...(earlier.length > 0 ? [{ label: "Earlier", items: earlier }] : [])
    ];
  }, [recentSessions, bookmarks, mistakes]);

  const iconMap = {
    exam: PlayCircle,
    bookmark: Bookmark,
    mistake: AlertCircle
  };

  const colorMap = {
    exam: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    bookmark: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    mistake: "bg-rose-500/10 text-rose-500 border-rose-500/20"
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="flex-none pb-4 border-b border-[var(--border-subtle)] mb-5">
        <h3 className="font-extrabold text-xs uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-indigo-500" />
          <span>Activity Log Timeline</span>
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 -mr-1 custom-scrollbar space-y-6">
        {groupedEvents.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center p-8 text-[var(--text-muted)] text-xs">
            Start solving quizzes or bookmarking questions to populate your activity.
          </div>
        ) : (
          groupedEvents.map((group, gIdx) => (
            <div key={group.label} className="space-y-4">
              <div className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider px-1">
                {group.label}
              </div>
              <div className="relative border-l border-[var(--border)] ml-3 pl-5 space-y-5">
                {group.items.map((item, iIdx) => {
                  const Icon = iconMap[item.type];
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (gIdx * 3 + iIdx) * 0.05 }}
                      className="relative group"
                    >
                      {/* Timeline dot node */}
                      <div className={`absolute -left-[29px] top-0.5 p-1 rounded-full border bg-[var(--surface)] transition-transform group-hover:scale-110 z-10 ${colorMap[item.type]}`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      
                      {/* Event details block */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-baseline gap-4">
                          <span className="font-bold text-xs text-[var(--text-primary)] group-hover:text-indigo-500 transition-colors">
                            {item.title}
                          </span>
                          <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                            {item.timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-[10px] text-[var(--text-secondary)] font-medium">
                          {item.meta}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
