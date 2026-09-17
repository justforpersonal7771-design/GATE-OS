"use client";

import { motion } from "motion/react";
import { PieChart, Trophy, GraduationCap } from "lucide-react";

interface SubjectPerformance {
  subject: string;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  timeSpentMs: number;
}

interface ProgressVisualizerProps {
  subjectPerformance: SubjectPerformance[];
  totalSolved: number;
}

export function ProgressVisualizer({ subjectPerformance, totalSolved }: ProgressVisualizerProps) {
  // Compute overall syllabus practice completion estimation (assuming target solved is 500 questions for practice completeness)
  const targetQuestions = 500;
  const overallCompletionPercentage = Math.min(Math.round((totalSolved / targetQuestions) * 100), 100);
  
  // Calculate SVG circle properties for circular progress
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallCompletionPercentage / 100) * circumference;

  const sortedSubjects = [...subjectPerformance]
    .map(s => ({
      ...s,
      acc: s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0
    }))
    .sort((a, b) => b.attempted - a.attempted)
    .slice(0, 4);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Left: Overall Completion Circle */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none" />
        <h4 className="font-extrabold text-xs uppercase tracking-widest text-[var(--text-muted)] mb-6 flex items-center gap-1.5">
          <GraduationCap className="w-4 h-4 text-indigo-500" />
          <span>Syllabus Complete</span>
        </h4>
        
        <div className="relative flex items-center justify-center w-36 h-36">
          <svg className="w-full h-full transform -rotate-90">
            {/* Trail */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              className="stroke-[var(--border-subtle)] fill-none"
              strokeWidth="10"
            />
            {/* Inner Ring Glow */}
            <motion.circle
              cx="72"
              cy="72"
              r={radius}
              className="stroke-indigo-500 fill-none"
              strokeWidth="10"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-[var(--text-primary)] font-mono">{overallCompletionPercentage}%</span>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Syllabus solved</span>
          </div>
        </div>

        <p className="text-xs text-[var(--text-secondary)] font-medium mt-6 leading-relaxed">
          Estimated based on <span className="font-bold text-[var(--text-primary)]">{totalSolved}</span> solved questions out of a standard {targetQuestions}-question core workspace target.
        </p>
      </div>

      {/* Middle & Right: Subject Mastery Progress Bars */}
      <div className="md:col-span-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col">
        <h4 className="font-extrabold text-xs uppercase tracking-widest text-[var(--text-muted)] mb-5 flex items-center gap-1.5">
          <PieChart className="w-4 h-4 text-indigo-500" />
          <span>Subject Accuracy matrix</span>
        </h4>

        {sortedSubjects.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[var(--text-muted)]">
            <Trophy className="w-10 h-10 mb-2 text-gray-300 dark:text-gray-700" />
            <p className="text-sm font-medium">No subject progress data available yet.</p>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sortedSubjects.map(subj => (
              <div 
                key={subj.subject} 
                className="flex flex-col justify-between p-4 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl hover:border-indigo-500/30 transition-colors"
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-xs text-[var(--text-primary)] line-clamp-1 w-[70%]" title={subj.subject}>
                      {subj.subject}
                    </span>
                    <span className="font-black text-xs text-[var(--text-primary)] font-mono">{subj.acc}%</span>
                  </div>
                  
                  {/* Progress Bar container */}
                  <div className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] h-2.5 rounded-full overflow-hidden">
                    <motion.div 
                      className={`h-full rounded-full ${subj.acc >= 70 ? 'bg-emerald-500' : subj.acc >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${subj.acc}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] font-black uppercase tracking-wider mt-4">
                  <span>{subj.attempted} Attempted</span>
                  <span>Avg Time: {Math.round(subj.timeSpentMs / Math.max(1, subj.attempted) / 1000)}s</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
