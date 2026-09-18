"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Check, Play, Trash2, Plus, X } from "lucide-react";
import { CalendarEvent } from "@/types/calendar.types";
import { toLocalDateStr } from "@/lib/utils";
import { useCalendarStore } from "@/store/use-calendar-store";
import { useRouter } from "next/navigation";

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export function CompactCalendarView({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { events, addEvent, updateEvent, deleteEvent } = useCalendarStore();
  const [cursor, setCursor] = useState(new Date());
  const todayStr = toLocalDateStr();
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);
  const [isAdding, setIsAdding] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");

  const monthDays = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    for (let i = firstDayIndex; i > 0; i--) {
      days.push({ date: new Date(year, month - 1, prevMonthLastDay - i + 1), isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDay; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return days;
  }, [cursor]);

  const eventDatesSet = useMemo(() => new Set(events.map(e => e.date)), [events]);

  const selectedDayEvents = useMemo(
    () => events.filter(e => e.date === selectedDateStr).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || "")),
    [events, selectedDateStr]
  );

  const changeMonth = (dir: number) => {
    const next = new Date(cursor);
    next.setMonth(cursor.getMonth() + dir);
    setCursor(next);
  };

  const handleQuickAdd = async () => {
    if (!quickTitle.trim()) return;
    await addEvent({
      id: crypto.randomUUID(),
      title: quickTitle.trim(),
      description: "",
      category: "Study",
      date: selectedDateStr,
      color: "#6366f1",
      priority: "Medium",
      completed: false,
      studyType: "Study",
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
    <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
      {/* Left: compact month grid */}
      <div className="p-3 w-full sm:w-[260px] shrink-0">
        <div className="flex items-center justify-between mb-2 px-0.5">
          <button onClick={() => changeMonth(-1)} className="p-1 rounded-md hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] cursor-pointer">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-black text-[var(--text-primary)] font-mono">
            {cursor.toLocaleDateString(undefined, { month: "short", year: "numeric" })}
          </span>
          <button onClick={() => changeMonth(1)} className="p-1 rounded-md hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] cursor-pointer">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-y-0.5">
          {WEEKDAY_LETTERS.map((d, i) => (
            <div key={i} className="text-[8px] font-black text-[var(--text-muted)] text-center py-1">{d}</div>
          ))}
          {monthDays.map((slot, idx) => {
            const dateStr = toLocalDateStr(slot.date);
            const isSelected = selectedDateStr === dateStr;
            const isToday = todayStr === dateStr;
            const hasEvents = eventDatesSet.has(dateStr);

            return (
              <button
                key={dateStr + idx}
                onClick={() => setSelectedDateStr(dateStr)}
                className={`relative w-full aspect-square flex items-center justify-center text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600 text-white"
                    : isToday
                    ? "bg-indigo-500/10 text-indigo-500"
                    : slot.isCurrentMonth
                    ? "text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                    : "text-[var(--text-muted)]/40 hover:bg-[var(--surface-secondary)]"
                }`}
              >
                {slot.date.getDate()}
                {hasEvents && !isSelected && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-indigo-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: selected day's tasks */}
      <div className="flex-1 flex flex-col min-w-0 sm:w-[260px]">
        <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border-subtle)]">
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
            {new Date(selectedDateStr + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </span>
          <button
            onClick={() => setIsAdding(v => !v)}
            className="p-1 rounded-md hover:bg-[var(--surface-secondary)] text-indigo-500 cursor-pointer"
            title="Add task"
          >
            {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 flex items-center gap-2 border-b border-[var(--border-subtle)]">
                <input
                  autoFocus
                  type="text"
                  placeholder="Task title..."
                  value={quickTitle}
                  onChange={e => setQuickTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleQuickAdd(); if (e.key === "Escape") setIsAdding(false); }}
                  className="flex-1 px-2.5 py-1.5 bg-[var(--surface-secondary)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={handleQuickAdd}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase rounded-lg cursor-pointer shrink-0"
                >
                  Add
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 max-h-[240px] overflow-y-auto custom-scrollbar">
          {selectedDayEvents.length === 0 ? (
            <div className="p-6 text-center text-[11px] font-semibold text-[var(--text-muted)]">
              No tasks for this day.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {selectedDayEvents.map(e => (
                <div key={e.id} className="p-3 flex items-center gap-2.5 hover:bg-[var(--surface-secondary)]/50 transition-colors group">
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
                    <p className="text-[9px] text-[var(--text-muted)] font-semibold">{e.studyType}</p>
                  </div>
                  <button
                    onClick={() => handleLaunch(e)}
                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-indigo-500 transition-all cursor-pointer shrink-0"
                    title="Quick launch"
                  >
                    <Play className="w-3 h-3 fill-indigo-500 stroke-none" />
                  </button>
                  <button
                    onClick={() => deleteEvent(e.id)}
                    className="p-1.5 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-rose-500 transition-all cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
