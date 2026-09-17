"use client";

import { motion } from "motion/react";
import { PlayCircle, PlusSquare, BookOpen, AlertOctagon, Bookmark, BarChart3, HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface QuickActionsProps {
  hasActiveSession: boolean;
  onResume: () => void;
}

export function QuickActions({ hasActiveSession, onResume }: QuickActionsProps) {
  const router = useRouter();

  const actions = [
    ...(hasActiveSession ? [{
      title: "Resume Paused Exam",
      desc: "Resume your active test session",
      icon: PlayCircle,
      color: "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:border-blue-500/50 shadow-blue-500/5",
      onClick: onResume
    }] : []),
    {
      title: "Launch Exam Engine",
      desc: "Create and launch standard mock tests",
      icon: PlusSquare,
      color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:border-indigo-500/50 shadow-indigo-500/5",
      onClick: () => router.push("/setup")
    },
    {
      title: "Revision Engine",
      desc: "Spaced practice for retention",
      icon: BookOpen,
      color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:border-emerald-500/50 shadow-emerald-500/5",
      onClick: () => router.push("/revision")
    },
    {
      title: "Mistakes Bank",
      desc: "Review and resolve logged errors",
      icon: AlertOctagon,
      color: "bg-rose-500/10 text-rose-500 border-rose-500/20 hover:border-rose-500/50 shadow-rose-500/5",
      onClick: () => router.push("/mistakes")
    },
    {
      title: "Bookmarks",
      desc: "Practice saved questions",
      icon: Bookmark,
      color: "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:border-amber-500/50 shadow-amber-500/5",
      onClick: () => router.push("/bookmarks")
    },
    {
      title: "Advanced Analytics",
      desc: "In-depth analytics matrix overview",
      icon: BarChart3,
      color: "bg-violet-500/10 text-violet-500 border-violet-500/20 hover:border-violet-500/50 shadow-violet-500/5",
      onClick: () => router.push("/analytics")
    },
    {
      title: "Custom Templates",
      desc: "Configure subject mock tests",
      icon: HelpCircle,
      color: "bg-pink-500/10 text-pink-500 border-pink-500/20 hover:border-pink-500/50 shadow-pink-500/5",
      onClick: () => router.push("/setup?tab=custom")
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-extrabold text-xs uppercase tracking-widest text-[var(--text-muted)] px-1">Quick Action Controls</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {actions.map((act, index) => {
          const Icon = act.icon;
          return (
            <motion.button
              key={act.title + index}
              onClick={act.onClick}
              whileHover={{ scale: 1.025, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-start gap-4 p-5 text-left border rounded-2xl bg-[var(--surface)] transition shadow-sm hover:shadow-md cursor-pointer ${act.color}`}
            >
              <div className="p-3 bg-white/5 dark:bg-black/10 rounded-xl shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="space-y-1 overflow-hidden">
                <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">{act.title}</h4>
                <p className="text-xs text-[var(--text-secondary)] font-medium leading-normal line-clamp-2">{act.desc}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
