"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Target, X, RotateCcw, Clock3, FileQuestion, TrendingUp, Sparkles, Check, Play, ListChecks } from "lucide-react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot,
} from "recharts";
import { useGoalSliderStore, GOAL_SLIDER_DEFAULT_PERCENT } from "@/store/use-goal-slider-store";
import { useDataStore } from "@/store/use-data-store";
import { useExamStore } from "@/store/use-exam-store";
import { useExamRuntimeStore } from "@/store/use-exam-runtime-store";
import { QuestionRepository } from "@/lib/repository/question-repository";
import {
  computeTopicFrequencies, computeGoalSliderCurve, computeGoalSliderResult, filterOfficialQuestions,
  type TopicFrequency,
} from "@/lib/analytics/goal-slider-engine";

const topicKey = (t: { subject: string; topic: string }) => `${t.subject}::${t.topic}`;

function formatStudyTime(seconds: number): string {
  const hours = seconds / 3600;
  if (hours < 1) return `${Math.round(seconds / 60)}m`;
  return `${hours.toFixed(1)}h`;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-xl text-xs pointer-events-none">
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
  const router = useRouter();
  const { isInitialized } = useDataStore();
  const { targetPercent, loaded, load, setTargetPercent, reset } = useGoalSliderStore();
  const [draftPercent, setDraftPercent] = useState(targetPercent);
  const [isDragging, setIsDragging] = useState(false);
  const draftPercentRef = useRef(draftPercent);
  const [manualOverrides, setManualOverrides] = useState<Record<string, boolean>>({});
  const [launchCount, setLaunchCount] = useState(65);
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loaded) {
      setDraftPercent(targetPercent);
      draftPercentRef.current = targetPercent;
    }
  }, [loaded, targetPercent]);

  const officialQuestions = useMemo(() => {
    if (!isInitialized) return [];
    return filterOfficialQuestions(QuestionRepository.getAllQuestions());
  }, [isInitialized]);

  const ranked = useMemo(() => computeTopicFrequencies(officialQuestions), [officialQuestions]);
  const curve = useMemo(() => computeGoalSliderCurve(ranked), [ranked]);
  const result = useMemo(
    () => computeGoalSliderResult(officialQuestions, draftPercent),
    [officialQuestions, draftPercent]
  );

  const applyPercentFromLabel = (activeLabel: any) => {
    if (activeLabel == null || ranked.length === 0) return;
    const topicsSelected = Number(activeLabel);
    if (Number.isNaN(topicsSelected)) return;
    const percent = Math.min(100, Math.max(5, Math.round((topicsSelected / ranked.length) * 100)));
    setDraftPercent(percent);
    draftPercentRef.current = percent;
  };

  const handleChartMouseDown = (state: any) => {
    setIsDragging(true);
    applyPercentFromLabel(state?.activeLabel);
  };
  const handleChartMouseMove = (state: any) => {
    if (isDragging) applyPercentFromLabel(state?.activeLabel);
  };
  const commitDrag = () => {
    setIsDragging(false);
    setTargetPercent(draftPercentRef.current);
  };
  const handleChartClick = (state: any) => {
    applyPercentFromLabel(state?.activeLabel);
    setTargetPercent(draftPercentRef.current);
  };

  // Catch a mouse/touch release outside the chart's own bounds so a drag never gets "stuck".
  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener("mouseup", commitDrag);
    window.addEventListener("touchend", commitDrag);
    return () => {
      window.removeEventListener("mouseup", commitDrag);
      window.removeEventListener("touchend", commitDrag);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  const handleReset = () => {
    setDraftPercent(GOAL_SLIDER_DEFAULT_PERCENT);
    draftPercentRef.current = GOAL_SLIDER_DEFAULT_PERCENT;
    setManualOverrides({});
    reset();
  };

  const handlePoint = curve[result.includedCount] ?? curve[curve.length - 1];

  // Algorithmic picks (from the current slider position) plus any manual check/uncheck the
  // student has made on top of it — this is what actually gets launched as a test.
  const includedKeySet = useMemo(
    () => new Set(result.includedTopics.map(topicKey)),
    [result.includedTopics]
  );
  const effectiveTopics = useMemo(
    () => ranked.filter((t) => manualOverrides[topicKey(t)] ?? includedKeySet.has(topicKey(t))),
    [ranked, manualOverrides, includedKeySet]
  );
  const effectiveKeySet = useMemo(() => new Set(effectiveTopics.map(topicKey)), [effectiveTopics]);

  const launchPool = useMemo(
    () => officialQuestions.filter((q) => effectiveKeySet.has(`${q.subject}::${q.topic}`)),
    [officialQuestions, effectiveKeySet]
  );

  // Stat tiles mirror whatever is actually checked (algorithmic pick + manual overrides),
  // not just the raw slider result, so they never disagree with the topic checklist below.
  const effectiveMarksCaptured = useMemo(() => {
    const totalMarks = ranked.reduce((sum, t) => sum + t.weightedMarks, 0);
    const capturedMarks = effectiveTopics.reduce((sum, t) => sum + t.weightedMarks, 0);
    return totalMarks > 0 ? (capturedMarks / totalMarks) * 100 : 0;
  }, [ranked, effectiveTopics]);

  const effectiveStudySeconds = useMemo(
    () => launchPool.reduce((sum, q) => sum + (q.marks || 1) * 108, 0),
    [launchPool]
  );

  const toggleTopic = (t: TopicFrequency) => {
    const key = topicKey(t);
    const currentlyChecked = manualOverrides[key] ?? includedKeySet.has(key);
    setManualOverrides((prev) => ({ ...prev, [key]: !currentlyChecked }));
  };

  const handleSelectAll = () => {
    const next: Record<string, boolean> = {};
    ranked.forEach((t) => { next[topicKey(t)] = true; });
    setManualOverrides(next);
  };
  const handleClearAll = () => {
    const next: Record<string, boolean> = {};
    ranked.forEach((t) => { next[topicKey(t)] = false; });
    setManualOverrides(next);
  };

  const handleLaunchTest = async () => {
    if (launchPool.length === 0 || isLaunching) return;
    setIsLaunching(true);
    try {
      const topicNames = Array.from(new Set(effectiveTopics.map((t) => t.topic)));
      useExamStore.getState().createDraft({
        examType: "CUSTOM_TEST",
        topics: topicNames,
        questionCount: Math.max(1, Math.min(launchCount, launchPool.length)),
        isAiGenerated: false,
        goalTag: {
          targetPercent: draftPercent,
          topicsCount: effectiveTopics.length,
          totalTopics: ranked.length,
          marksCaptured: effectiveMarksCaptured,
        },
      });
      const draft = useExamStore.getState().currentDraft;
      if (draft) {
        await useExamRuntimeStore.getState().startSession(draft);
        onClose();
        router.push("/exam/session");
      }
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-3 p-5 border-b border-[var(--border-subtle)] bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="font-black text-white text-sm sm:text-base">Focus Target</h2>
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

        {!isInitialized || ranked.length === 0 ? (
          <div className="py-16 text-center text-sm font-semibold text-[var(--text-muted)]">
            Loading question repository…
          </div>
        ) : (
          <div className="flex-1 min-h-0 p-5 grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Left: chart + stats */}
            <div className="lg:col-span-3 min-h-0 overflow-y-auto custom-scrollbar pr-1 space-y-4">
              <div className="bg-[var(--surface-secondary)]/40 border border-[var(--border-subtle)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide">
                    Drag on the graph to set your target
                  </span>
                  <span className="text-base font-black text-indigo-500">{draftPercent}% syllabus</span>
                </div>

                <div className="h-[260px] select-none" style={{ cursor: isDragging ? "grabbing" : "grab" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={curve}
                      margin={{ top: 8, right: 12, bottom: 4, left: -12 }}
                      onMouseDown={handleChartMouseDown}
                      onMouseMove={handleChartMouseMove}
                      onMouseUp={commitDrag}
                      onTouchStart={handleChartMouseDown}
                      onTouchMove={handleChartMouseMove}
                      onTouchEnd={commitDrag}
                      onClick={handleChartClick}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                      <XAxis
                        dataKey="topicsSelected"
                        stroke="var(--text-muted)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
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
                      <ReferenceLine x={result.includedCount} stroke="var(--text-muted)" strokeDasharray="4 4" />
                      <Line type="linear" dataKey="syllabusPercent" name="Syllabus Covered" stroke="#6366f1" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="marksPercent" name="Marks Covered" stroke="#f59e0b" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                      <ReferenceDot x={handlePoint.topicsSelected} y={handlePoint.marksPercent} r={6} fill="#f59e0b" stroke="var(--surface)" strokeWidth={2} />
                      <ReferenceDot x={handlePoint.topicsSelected} y={handlePoint.syllabusPercent} r={5} fill="#6366f1" stroke="var(--surface)" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Axis caption + legend rendered as plain HTML below the chart, so they can never
                    collide with recharts' own tick labels the way in-SVG label/legend elements did. */}
                <p className="text-[9px] text-[var(--text-muted)] font-semibold text-center mt-1.5">
                  Topics selected (ranked by importance) →
                </p>
                <div className="flex items-center justify-center gap-4 mt-1.5">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Marks Covered
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Syllabus Covered
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] font-medium text-center mt-2">
                  Marks coverage can reach 100% well before full syllabus — high-yield topics are prioritized first.
                </p>
              </div>

              {/* Stat tiles */}
              <div className="grid grid-cols-2 gap-3">
                <StatTile icon={Target} label="Topics Selected" value={`${effectiveTopics.length}/${result.totalTopics}`} color="indigo" />
                <StatTile icon={TrendingUp} label="Marks Covered" value={`${effectiveMarksCaptured.toFixed(1)}%`} color="amber" />
                <StatTile icon={FileQuestion} label="PYQ Questions" value={`${launchPool.length}/${result.totalPyqQuestions}`} color="blue" />
                <StatTile icon={Clock3} label="Est. Study Time" value={formatStudyTime(effectiveStudySeconds)} color="emerald" />
              </div>
            </div>

            {/* Right: full topic checklist — check/uncheck to fine-tune, then launch a test */}
            <div className="lg:col-span-2 min-h-0 flex flex-col bg-[var(--surface-secondary)]/30 border border-[var(--border-subtle)] rounded-xl overflow-hidden">
              <div className="shrink-0 px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                  Topics ({effectiveTopics.length}/{ranked.length})
                </h3>
                <div className="flex items-center gap-2">
                  <button onClick={handleSelectAll} className="text-[9px] font-black uppercase text-indigo-500 hover:underline cursor-pointer">All</button>
                  <button onClick={handleClearAll} className="text-[9px] font-black uppercase text-[var(--text-muted)] hover:underline cursor-pointer">None</button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-1">
                {ranked.map((t, i) => {
                  const key = topicKey(t);
                  const checked = manualOverrides[key] ?? includedKeySet.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleTopic(t)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left cursor-pointer transition-colors ${
                        checked
                          ? "bg-[var(--surface)] border-[var(--border-subtle)]"
                          : "bg-transparent border-transparent opacity-50 hover:opacity-80"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border transition-colors ${
                          checked ? "bg-indigo-600 border-indigo-600" : "border-[var(--border)]"
                        }`}
                      >
                        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </span>
                      <span className="text-[10px] font-black text-[var(--text-muted)] w-5 shrink-0">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">{t.topic}</p>
                        <p className="text-[10px] text-[var(--text-muted)] font-semibold truncate">{t.subject}</p>
                      </div>
                      <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 shrink-0">
                        {t.marksShare.toFixed(1)}%
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Launch */}
              <div className="shrink-0 p-3 border-t border-[var(--border-subtle)] bg-[var(--surface)]/60 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[9px] font-black uppercase tracking-wide text-[var(--text-muted)] flex items-center gap-1">
                    <ListChecks className="w-3 h-3" /> Questions
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, launchPool.length)}
                    value={Math.min(launchCount, Math.max(1, launchPool.length))}
                    onChange={(e) => setLaunchCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-2 py-1 text-xs font-bold text-right bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-[var(--text-muted)] font-semibold">/ {launchPool.length} available</span>
                </div>
                <button
                  onClick={handleLaunchTest}
                  disabled={launchPool.length === 0 || isLaunching}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold uppercase tracking-wide rounded-xl shadow-lg shadow-indigo-600/20 transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  {isLaunching ? "Launching…" : "Launch Test From Selection"}
                </button>
              </div>
            </div>
          </div>
        )}
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
