"use client";

import { useMemo } from "react";
import { Flame } from "lucide-react";

import { AnalyticsSnapshot } from "@/types/analytics.types";

interface GithubHeatmapProps {
  snapshots: AnalyticsSnapshot[];
}

export function GithubHeatmap({ snapshots }: GithubHeatmapProps) {
  // Generate heatmap data for the last 60 days
  const heatmapDays = useMemo(() => {
    return Array.from({ length: 60 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (59 - i));
      const dateStr = d.toISOString().split('T')[0];
      const snap = snapshots.find(s => s.id === dateStr);
      
      const attempted = snap ? snap.totalQuestionsAttempted : 0;
      const correct = snap ? snap.totalCorrect : 0;
      const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
      const durationMin = snap ? Math.round(snap.totalTimeSpentMs / 1000 / 60) : 0;

      return {
        date: dateStr,
        attempted,
        accuracy,
        durationMin,
        formattedDate: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
      };
    });
  }, [snapshots]);

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
      <div>
        <h3 className="font-extrabold text-xs uppercase tracking-widest text-[var(--text-muted)] mb-5 flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-rose-500 fill-rose-500 stroke-none" />
          <span>Practice Heatmap (60 Days)</span>
        </h3>
        
        {/* Heatmap Grid */}
        <div className="flex flex-wrap gap-1.5 py-2">
          {heatmapDays.map((day, idx) => {
            let color = "bg-[var(--surface-elevated)]";
            if (day.attempted > 0 && day.attempted < 10) color = "bg-emerald-500/20 text-emerald-300";
            else if (day.attempted >= 10 && day.attempted < 25) color = "bg-emerald-500/50 text-emerald-100";
            else if (day.attempted >= 25) color = "bg-emerald-500 text-white";

            return (
              <div 
                key={day.date + idx} 
                className={`relative w-4 h-4 rounded-sm ${color} transition-all duration-300 hover:scale-125 cursor-pointer group`}
              >
                {/* Embedded HTML Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                  <div className="bg-slate-900 border border-slate-700/50 text-white text-[10px] p-2.5 rounded-lg shadow-xl whitespace-nowrap leading-relaxed font-bold tracking-normal flex flex-col gap-0.5">
                    <span className="text-slate-400 font-semibold">{day.formattedDate}</span>
                    <span>Solved: <strong className="text-white">{day.attempted} Questions</strong></span>
                    {day.attempted > 0 && (
                      <>
                        <span>Accuracy: <strong className="text-emerald-400">{day.accuracy}%</strong></span>
                        <span>Duration: <strong className="text-indigo-400">{day.durationMin}m</strong></span>
                      </>
                    )}
                  </div>
                  {/* Arrow tooltip indicator */}
                  <div className="w-1.5 h-1.5 bg-slate-900 border-r border-b border-slate-700/50 transform rotate-45 mx-auto -mt-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-[var(--border-subtle)] text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">
        <span>Less Solved</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-sm bg-[var(--surface-elevated)]"></span>
          <span className="w-3.5 h-3.5 rounded-sm bg-emerald-500/20"></span>
          <span className="w-3.5 h-3.5 rounded-sm bg-emerald-500/50"></span>
          <span className="w-3.5 h-3.5 rounded-sm bg-emerald-500"></span>
        </div>
        <span>More Solved</span>
      </div>
    </div>
  );
}
