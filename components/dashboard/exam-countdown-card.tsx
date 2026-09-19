"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronRight, Flag } from "lucide-react";
import { useCalendarStore } from "@/store/use-calendar-store";
import { IDBManager } from "@/lib/repository/storage/idb-manager";
import { toLocalDateStr, formatTime12h, GATE_2027_EXAM_DATE } from "@/lib/utils";

const TARGET_EXAM_DATE_KEY = "target_exam_date";

const PRIORITY_DOT: Record<string, string> = {
  Low: "bg-blue-500",
  Medium: "bg-amber-500",
  High: "bg-rose-500",
};

export function ExamCountdownCard() {
  const router = useRouter();
  const { events, loadEvents } = useCalendarStore();
  const [examDate, setExamDate] = useState<string>(GATE_2027_EXAM_DATE);

  useEffect(() => {
    loadEvents();
    IDBManager.getMetadata(TARGET_EXAM_DATE_KEY).then((rec) => {
      if (rec?.value) setExamDate(String(rec.value));
    });
  }, [loadEvents]);

  const todayStr = toLocalDateStr();

  const daysLeft = useMemo(() => {
    return Math.round(
      (new Date(examDate + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24)
    );
  }, [examDate, todayStr]);

  const upcomingScheduled = useMemo(() => {
    return events
      .filter((e) => e.date >= todayStr && e.status !== "Completed" && e.status !== "Cancelled")
      .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || "").localeCompare(b.startTime || ""))
      .slice(0, 4);
  }, [events, todayStr]);

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-5 shadow-sm relative overflow-hidden">
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex items-center justify-between mb-4">
        <h3 className="font-extrabold text-xs uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1.5">
          <CalendarClock className="w-3.5 h-3.5 text-indigo-500" />
          GATE 2027 Countdown
        </h3>
        <button
          onClick={() => router.push("/setup")}
          className="text-[9px] font-black uppercase tracking-wider text-indigo-500 hover:text-indigo-400 flex items-center gap-0.5 cursor-pointer"
        >
          Plan <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="relative flex items-baseline gap-2 mb-1">
        <span className="text-4xl font-black font-mono text-[var(--text-primary)]">
          {daysLeft >= 0 ? daysLeft : 0}
        </span>
        <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">
          {daysLeft >= 0 ? "days left" : "exam date passed"}
        </span>
      </div>
      <p className="relative text-[10px] font-semibold text-[var(--text-muted)] mb-4">
        Target: {new Date(examDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
      </p>

      <div className="relative border-t border-[var(--border-subtle)] pt-3 space-y-1.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Scheduled Ahead</p>
        {upcomingScheduled.length === 0 ? (
          <p className="text-[11px] font-semibold text-[var(--text-muted)] py-2">Nothing scheduled yet — plan your next session.</p>
        ) : (
          upcomingScheduled.map((e) => (
            <div key={e.id} className="flex items-center gap-2 py-1.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[e.priority] || "bg-slate-400"}`} title={`${e.priority} priority`} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-[var(--text-primary)] truncate">{e.title}</p>
                <p className="text-[9px] font-semibold text-[var(--text-muted)]">
                  {e.date === todayStr ? "Today" : new Date(e.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  {e.startTime ? ` · ${formatTime12h(e.startTime)}` : ""}
                </p>
              </div>
              <Flag className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
