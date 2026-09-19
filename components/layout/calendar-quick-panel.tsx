"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Calendar, Plus, Play, Check, X, Clock3, ChevronRight, ChevronLeft, Target } from "lucide-react";
import { useCalendarStore } from "@/store/use-calendar-store";
import { IDBManager } from "@/lib/repository/storage/idb-manager";
import { toLocalDateStr, formatTime12h, GATE_2027_EXAM_DATE } from "@/lib/utils";
import { CalendarEvent } from "@/types/calendar.types";
import { CompactCalendarView } from "./compact-calendar-view";
import { CustomDropdown } from "@/components/ui/custom-dropdown";

const TARGET_EXAM_DATE_KEY = "target_exam_date";
const QUICK_TYPE_OPTIONS = [
  { label: "Study", value: "Study" },
  { label: "Revision", value: "Revision" },
  { label: "Mock Test", value: "Mock Test" },
  { label: "Mistakes", value: "Mistakes" },
  { label: "Bookmarks", value: "Bookmarks" },
];

export function CalendarQuickPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { events, loadEvents, addEvent, updateEvent } = useCalendarStore();
  const [isAdding, setIsAdding] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickType, setQuickType] = useState<CalendarEvent["studyType"]>("Study");
  const [examDate, setExamDate] = useState<string | null>(GATE_2027_EXAM_DATE);
  const [editingExamDate, setEditingExamDate] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadEvents();
    IDBManager.getMetadata(TARGET_EXAM_DATE_KEY).then(rec => {
      if (rec?.value) setExamDate(String(rec.value));
    });
  }, [loadEvents]);

  useEffect(() => {
    if (isAdding) inputRef.current?.focus();
  }, [isAdding]);

  const todayStr = toLocalDateStr();
  const weekAheadStr = toLocalDateStr(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  const todayEvents = useMemo(
    () => events.filter(e => e.date === todayStr).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || "")),
    [events, todayStr]
  );

  const overdueCount = useMemo(
    () => events.filter(e => e.date < todayStr && e.status !== "Completed" && e.status !== "Cancelled").length,
    [events, todayStr]
  );

  const upcomingCount = useMemo(
    () => events.filter(e => e.date > todayStr && e.date <= weekAheadStr && e.status !== "Completed").length,
    [events, todayStr, weekAheadStr]
  );

  const daysToExam = examDate
    ? Math.round((new Date(examDate + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const handleSaveExamDate = async (value: string) => {
    setExamDate(value);
    setEditingExamDate(false);
    await IDBManager.setMetadata(TARGET_EXAM_DATE_KEY, value);
  };

  const handleQuickAdd = async () => {
    if (!quickTitle.trim()) return;
    await addEvent({
      id: crypto.randomUUID(),
      title: quickTitle.trim(),
      description: "",
      category: quickType === "Revision" ? "Revision" : quickType === "Mock Test" ? "Mock Test" : "Study",
      date: todayStr,
      color: "#6366f1",
      priority: "Medium",
      completed: false,
      studyType: quickType,
      timeRangeType: "date_only",
      revisionCycle: "One Time",
      status: "Pending",
    });
    setQuickTitle("");
    setIsAdding(false);
  };

  const handleToggleComplete = async (e: CalendarEvent) => {
    const nextCompleted = !e.completed;
    await updateEvent(e.id, { completed: nextCompleted, status: nextCompleted ? "Completed" : "Pending" });
  };

  const handleLaunch = (e: CalendarEvent) => {
    onClose();
    const type = e.studyType;
    if (type === "Revision") router.push("/revision");
    else if (type === "Mistakes") router.push("/mistakes");
    else if (type === "Bookmarks") router.push("/bookmarks");
    else router.push("/setup");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className={`fixed sm:absolute left-4 right-4 sm:left-auto top-16 sm:top-full sm:right-0 mt-0 sm:mt-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden z-50 transition-[width] duration-200 ${
        isExpanded ? "sm:w-[min(520px,calc(100vw-2rem))]" : "sm:w-[360px]"
      }`}
    >
      {/* Header */}
      <div className="relative overflow-hidden p-4 flex items-center justify-between gap-2 bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700">
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative flex items-center gap-2">
          {isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 -ml-1 mr-1 text-white/70 hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer"
              title="Back to quick view"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <Calendar className="w-4 h-4 text-white" />
          <span className="font-extrabold text-xs uppercase tracking-widest text-white">
            {isExpanded ? "Study Planner" : "Today's Plan"}
          </span>
        </div>
        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="relative flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/90 hover:text-white transition-colors cursor-pointer"
          >
            Full Planner <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {isExpanded ? (
        <CompactCalendarView onClose={onClose} />
      ) : (
        <>
      {/* Exam countdown */}
      <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/40 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wide">
          <Target className="w-3 h-3 text-rose-500" />
          Target Exam
        </div>
        {editingExamDate ? (
          <input
            type="date"
            autoFocus
            defaultValue={examDate || ""}
            onBlur={(e) => e.target.value && handleSaveExamDate(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className="text-[10px] font-bold bg-[var(--background)] border border-[var(--border)] rounded px-1.5 py-0.5 outline-none text-[var(--text-primary)]"
          />
        ) : (
          <button
            onClick={() => setEditingExamDate(true)}
            className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
              daysToExam === null
                ? "text-[var(--text-primary)] hover:text-indigo-500"
                : daysToExam < 0
                ? "bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                : daysToExam <= 14
                ? "bg-rose-500/10 text-rose-500"
                : daysToExam <= 45
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {daysToExam !== null ? (daysToExam >= 0 ? `${daysToExam} days left` : "Date passed") : "Set date"}
          </button>
        )}
      </div>

      {/* Today's agenda */}
      <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
        {todayEvents.length === 0 ? (
          <div className="p-6 text-center text-[11px] font-semibold text-[var(--text-muted)]">
            No tasks scheduled for today.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {todayEvents.map(e => (
              <div key={e.id} className="relative p-3 pl-4 flex items-center gap-2.5 hover:bg-[var(--surface-secondary)]/50 transition-colors group">
                <span
                  className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full ${
                    e.studyType === "Revision" ? "bg-purple-500" :
                    e.studyType === "Mock Test" ? "bg-rose-500" :
                    e.studyType === "Mistakes" ? "bg-amber-500" :
                    e.studyType === "Bookmarks" ? "bg-blue-500" : "bg-indigo-500"
                  }`}
                />
                <button
                  onClick={() => handleToggleComplete(e)}
                  className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                    e.completed ? "bg-emerald-500 border-emerald-500" : "border-[var(--border)] hover:border-emerald-500"
                  }`}
                >
                  {e.completed && <Check className="w-2.5 h-2.5 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold truncate ${e.completed ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}>
                    {e.title}
                  </p>
                  <p className="text-[9px] text-[var(--text-muted)] font-semibold flex items-center gap-1">
                    <Clock3 className="w-2.5 h-2.5" /> {e.startTime ? formatTime12h(e.startTime) : "Anytime"} · {e.studyType}
                  </p>
                </div>
                <button
                  onClick={() => handleLaunch(e)}
                  className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-indigo-500 transition-all cursor-pointer shrink-0"
                  title="Quick launch"
                >
                  <Play className="w-3 h-3 fill-indigo-500 stroke-none" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick add */}
      <div className="p-3 border-t border-[var(--border-subtle)]">
        <AnimatePresence mode="wait">
          {isAdding ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Task title..."
                value={quickTitle}
                onChange={e => setQuickTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleQuickAdd(); if (e.key === "Escape") setIsAdding(false); }}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <CustomDropdown
                    value={quickType}
                    onChange={(v) => setQuickType(v as CalendarEvent["studyType"])}
                    options={QUICK_TYPE_OPTIONS}
                    className="text-[10px] font-bold [&>button]:px-2.5 [&>button]:py-1.5 [&>button]:rounded-lg"
                  />
                </div>
                <button
                  onClick={handleQuickAdd}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                >
                  Add
                </button>
                <button
                  onClick={() => setIsAdding(false)}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ) : (
            <button
              key="trigger"
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-indigo-500 border border-dashed border-[var(--border)] hover:border-indigo-500/50 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add task for today
            </button>
          )}
        </AnimatePresence>
      </div>

      {/* Footer stats */}
      {(overdueCount > 0 || upcomingCount > 0) && (
        <div className="px-4 py-2.5 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)]/30 flex items-center justify-center gap-4 text-[9px] font-black uppercase tracking-wider">
          {overdueCount > 0 && <span className="text-rose-500">{overdueCount} Overdue</span>}
          {upcomingCount > 0 && <span className="text-[var(--text-muted)]">{upcomingCount} Upcoming (7d)</span>}
        </div>
      )}
        </>
      )}
    </motion.div>
  );
}
