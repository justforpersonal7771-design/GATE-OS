"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Target, X, RotateCcw, Clock3, FileQuestion, TrendingUp, Sparkles } from "lucide-react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { useGoalSliderStore, GOAL_SLIDER_DEFAULT_PERCENT } from "@/store/use-goal-slider-store";
import { useDataStore } from "@/store/use-data-store";
import { QuestionRepository } from "@/lib/repository/question-repository";
import {
  computeTopicFrequencies, computeGoalSliderCurve, computeGoalSliderResult,
} from "@/lib/analytics/goal-slider-engine";

function formatStudyTime(seconds: number): string {
  const hours = seconds / 3600;
  if (hours < 1) return `${Math.round(seconds / 60)}m`;
  return `${hours.toFixed(1)}h`;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="font-bold text-[var(--text-primary)] mb-1">{label} topics selected</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.stroke }} className="font-semibold">
          {p.name}: {p.value.toFixed(1)}%
        </p>
      ))}
    </div>
  );
}

export function GoalSliderPanel({ onClose }: { onClose: () => void }) {
  const { isInitialized } = useDataStore();
  const { targetPercent, loaded, load, setTargetPercent, reset } = useGoalSliderStore();
  const [draftPercent, setDraftPercent] = useState(targetPercent);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loaded) setDraftPercent(targetPercent);
  }, [loaded, targetPercent]);

  const ranked = useMemo(() => {
    if (!isInitialized) return [];
    // Rank only official PYQ questions — AI-generated practice questions shouldn't skew
    // what's supposed to be a real historical exam-frequency signal.
    const officialQuestions = QuestionRepository.getAllQuestions().filter(
      (q) => q.year !== "AI" && !q.question_id.startsWith("ai_")
    );
    return computeTopicFrequencies(officialQuestions);
  }, [isInitialized]);

  const officialQuestions = useMemo(() => {
    if (!isInitialized) return [];
    return QuestionRepository.getAllQuestions().filter((q) => q.year !== "AI" && !q.question_id.startsWith("ai_"));
  }, [isInitialized]);

  const curve = useMemo(() => computeGoalSliderCurve(ranked), [ranked]);
  const result = useMemo(
    () => computeGoalSliderResult(officialQuestions, draftPercent),
    [officialQuestions, draftPercent]
  );

  const handleSliderChange = (value: number) => setDraftPercent(value);
  const handleSliderCommit = () => setTargetPercent(draftPercent);
  const handleReset = () => {
    setDraftPercent(GOAL_SLIDER_DEFAULT_PERCENT);
    reset();
  };

  const currentCurvePoint = curve[result.includedCount] ?? curve[curve.length - 1];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 p-5 border-b border-[var(--border-subtle)] bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="font-black text-white text-sm sm:text-base">AI Goal Slider</h2>
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-wide">
                PYQ Prioritized · High-yield topics first
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide text-white/90 hover:text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset to Full
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {!isInitialized || ranked.length === 0 ? (
            <div className="py-16 text-center text-sm font-semibold text-[var(--text-muted)]">
              Loading question repository…
            </div>
          ) : (
            <>
              {/* Chart */}
              <div className="bg-[var(--surface-secondary)]/40 border border-[var(--border-subtle)] rounded-xl p-4">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={curve} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                      <XAxis
                        dataKey="topicsSelected"
                        stroke="var(--text-muted)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: "Topics selected (ranked by importance)", position: "insideBottom", offset: -2, fontSize: 10, fill: "var(--text-muted)" }}
                      />
                      <YAxis
                        stroke="var(--text-muted)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <RechartsTooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }} />
                      <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                      <ReferenceLine x={result.includedCount} stroke="var(--text-muted)" strokeDasharray="4 4" />
                      <Line type="linear" dataKey="syllabusPercent" name="Syllabus Covered" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="marksPercent" name="Marks Covered" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] font-medium text-center mt-1">
                  Marks coverage can reach 100% well before full syllabus — high-yield topics are prioritized first.
                </p>
              </div>

              {/* Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">Target Syllabus Coverage</span>
                  <span className="text-lg font-black text-indigo-500">{draftPercent}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={1}
                  value={draftPercent}
                  onChange={(e) => handleSliderChange(Number(e.target.value))}
                  onMouseUp={handleSliderCommit}
                  onTouchEnd={handleSliderCommit}
                  onKeyUp={handleSliderCommit}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--surface-secondary)] accent-indigo-600"
                />
              </div>

              {/* Stat tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTile icon={Target} label="Topics Selected" value={`${result.includedCount}/${result.totalTopics}`} color="indigo" />
                <StatTile icon={TrendingUp} label="Marks Covered" value={`${result.marksCaptured.toFixed(1)}%`} color="amber" />
                <StatTile icon={FileQuestion} label="PYQ Questions" value={`${result.pyqQuestionsCovered}/${result.totalPyqQuestions}`} color="blue" />
                <StatTile icon={Clock3} label="Est. Study Time" value={formatStudyTime(result.estStudySeconds)} color="emerald" />
              </div>

              {/* Selected topics list */}
              <div>
                <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                  Prioritized Topics ({result.includedTopics.length})
                </h3>
                <div className="max-h-[220px] overflow-y-auto custom-scrollbar space-y-1 pr-1">
                  {result.includedTopics.map((t, i) => (
                    <div
                      key={`${t.subject}::${t.topic}`}
                      className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] rounded-lg"
                    >
                      <span className="text-[10px] font-black text-[var(--text-muted)] w-5 shrink-0">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">{t.topic}</p>
                        <p className="text-[10px] text-[var(--text-muted)] font-semibold truncate">{t.subject}</p>
                      </div>
                      <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 shrink-0">
                        {t.marksShare.toFixed(1)}% marks
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: "indigo" | "amber" | "blue" | "emerald" }) {
  const colorMap = {
    indigo: "text-indigo-500 bg-indigo-500/10",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    blue: "text-blue-500 bg-blue-500/10",
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  };
  return (
    <div className="p-3 bg-[var(--surface-secondary)]/40 border border-[var(--border-subtle)] rounded-xl">
      <div className={`w-6 h-6 rounded-md flex items-center justify-center mb-1.5 ${colorMap[color]}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <p className="text-sm font-black text-[var(--text-primary)]">{value}</p>
      <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
    </div>
  );
}
