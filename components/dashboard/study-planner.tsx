"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, Clock, Tag, Flag, 
  Play, Check, Trash2, CalendarRange, Clock3, AlertTriangle, 
  CheckSquare, BookOpen, Star, HelpCircle, AlertCircle, RefreshCw, Zap
} from "lucide-react";
import { CalendarEvent } from "@/types/calendar.types";
import { useRouter } from "next/navigation";
import { toLocalDateStr, formatTime12h } from "@/lib/utils";
import { useCalendarStore } from "@/store/use-calendar-store";

export function StudyPlanner() {
  const router = useRouter();
  const { events, loadEvents, addEvent, updateEvent, deleteEvent } = useCalendarStore();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<"month" | "week" | "day">("month");
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  
  // Event creation form state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: "",
    description: "",
    category: "Study",
    date: toLocalDateStr(),
    color: "#6366f1",
    priority: "Medium",
    completed: false,
    studyType: "Study",
    difficulty: "Medium",
    targetQuestions: 15,
    timeRangeType: "start_time",
    startTime: "10:00",
    endTime: "11:00",
    durationMin: 60,
    estimatedDurationMin: 60,
    revisionCycle: "One Time",
    status: "Pending",
    notes: "",
    reminderToggle: false,
    subject: "",
    topic: "",
    section: ""
  });

  // Selected day state for detail preview
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    toLocalDateStr()
  );

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title) return;

    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      title: newEvent.title,
      description: newEvent.description || "",
      category: newEvent.category || "Study",
      date: newEvent.date || selectedDateStr,
      color: newEvent.color || "#6366f1",
      priority: newEvent.priority || "Medium",
      completed: false,
      studyType: newEvent.studyType || "Study",
      difficulty: newEvent.difficulty || "Medium",
      targetQuestions: Number(newEvent.targetQuestions) || 15,
      timeRangeType: newEvent.timeRangeType || "date_only",
      startTime: newEvent.startTime || "10:00",
      endTime: newEvent.endTime || "11:00",
      durationMin: Number(newEvent.durationMin) || 60,
      estimatedDurationMin: Number(newEvent.estimatedDurationMin) || 60,
      revisionCycle: newEvent.revisionCycle || "One Time",
      status: "Pending",
      notes: newEvent.notes || "",
      reminderToggle: !!newEvent.reminderToggle,
      subject: newEvent.subject || "",
      topic: newEvent.topic || "",
      section: newEvent.section || ""
    };

    await addEvent(event);
    setIsAddOpen(false);
    
    // Reset Form
    setNewEvent({
      title: "",
      description: "",
      category: "Study",
      date: selectedDateStr,
      color: "#6366f1",
      priority: "Medium",
      completed: false,
      studyType: "Study",
      difficulty: "Medium",
      targetQuestions: 15,
      timeRangeType: "start_time",
      startTime: "10:00",
      endTime: "11:00",
      durationMin: 60,
      estimatedDurationMin: 60,
      revisionCycle: "One Time",
      status: "Pending",
      notes: "",
      reminderToggle: false,
      subject: "",
      topic: "",
      section: ""
    });
  };

  const handleStatusChange = async (id: string, nextStatus: CalendarEvent["status"]) => {
    await updateEvent(id, { status: nextStatus, completed: nextStatus === "Completed" });
  };

  const handleToggleComplete = async (id: string) => {
    const event = events.find(e => e.id === id);
    if (!event) return;
    const nextCompleted = !event.completed;
    await updateEvent(id, { completed: nextCompleted, status: nextCompleted ? "Completed" : "Pending" });
  };

  const handleDeleteEvent = async (id: string) => {
    await deleteEvent(id);
  };

  // Launch target engine dynamically (Quick Launch - Part 7)
  const handleLaunchEvent = (event: CalendarEvent) => {
    const type = event.studyType;
    if (type === "Revision") {
      router.push("/revision");
    } else if (type === "Mock Test") {
      router.push("/setup");
    } else if (type === "Bookmarks") {
      router.push("/bookmarks");
    } else if (type === "Mistakes") {
      router.push("/mistakes");
    } else if (type === "Custom Test" || type === "Weak Topics" || type === "Random Practice") {
      const topicParam = event.topic ? `?topic=${encodeURIComponent(event.topic)}` : "";
      router.push(`/setup${topicParam}`);
    } else {
      router.push("/setup");
    }
  };

  // Month days calculator
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const days = [];

    // Prev month overflow days
    for (let i = firstDayIndex; i > 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthLastDay - i + 1);
      days.push({ date: prevDate, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= lastDay; i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }

    // Next month overflow days
    const totalSlots = 42;
    const nextDaysNeeded = totalSlots - days.length;
    for (let i = 1; i <= nextDaysNeeded; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({ date: nextDate, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  // Week days calculator
  const weekDays = useMemo(() => {
    const currentDayOfWeek = currentDate.getDay();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  }, [currentDate]);

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewType === "month") {
      newDate.setMonth(currentDate.getMonth() + direction);
    } else if (viewType === "week") {
      newDate.setDate(currentDate.getDate() + direction * 7);
    } else {
      newDate.setDate(currentDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  const setToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(toLocalDateStr(today));
  };

  const selectedDayEvents = useMemo(() => {
    return events.filter(e => e.date === selectedDateStr);
  }, [events, selectedDateStr]);

  const todayStr = toLocalDateStr();
  
  // Dashboard highlights (Today, Upcoming, Overdue, Completed) - Part 7
  const stats = useMemo(() => {
    const todayEvents = events.filter(e => e.date === todayStr);
    const completedToday = todayEvents.filter(e => e.completed || e.status === "Completed").length;
    const pendingToday = todayEvents.filter(e => e.status === "Pending" || e.status === "In Progress").length;

    // Overdue tasks
    const overdue = events.filter(e => e.date < todayStr && e.status !== "Completed" && e.status !== "Cancelled");
    
    // Upcoming tasks (next 7 days)
    const upcoming = events.filter(e => e.date > todayStr && e.status !== "Completed")
      .sort((a, b) => a.date.localeCompare(b.date));

    // Completed Today list
    const completedList = events.filter(e => e.date === todayStr && e.status === "Completed");

    return {
      completedToday,
      pendingToday,
      overdue,
      upcoming,
      completedList
    };
  }, [events, todayStr]);

  // Priority color tags
  const priorityColors = {
    Low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    Medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    High: "bg-rose-500/10 text-rose-500 border-rose-500/20"
  };

  // Status badge colors
  const statusColors = {
    Pending: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    "In Progress": "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    Completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    Skipped: "bg-gray-400/10 text-gray-500 border-gray-400/20 dashed",
    Cancelled: "bg-rose-500/10 text-rose-500 border-rose-500/20 line-through"
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
      
      {/* Left Column: Visual study calendar planner dashboard */}
      <div className="lg:col-span-8 bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-5 md:p-6 shadow-sm flex flex-col h-[560px] overflow-hidden">
        
        {/* Planner Header controls */}
        <div className="flex-none flex flex-col sm:flex-row gap-4 justify-between sm:items-center border-b border-[var(--border-subtle)] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-extrabold text-xs uppercase tracking-widest text-[var(--text-primary)] flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>Study Schedule Engine</span>
            </h3>
            
            <div className="flex bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl p-0.5 text-[10px] font-bold uppercase tracking-wider">
              {["month", "week", "day"].map((type) => (
                <button 
                  key={type}
                  onClick={() => setViewType(type as any)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${viewType === type ? 'bg-[var(--surface)] shadow text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={setToday}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl transition cursor-pointer"
            >
              Today
            </button>
            
            <div className="flex items-center bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl p-0.5">
              <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-[var(--surface)] rounded-lg transition text-[var(--text-secondary)] cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-bold text-[var(--text-primary)] min-w-[90px] text-center font-mono">
                {currentDate.toLocaleDateString(undefined, { 
                  month: "short", 
                  year: "numeric",
                  day: viewType === "day" ? "numeric" : undefined
                })}
              </span>
              <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-[var(--surface)] rounded-lg transition text-[var(--text-secondary)] cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button 
              onClick={() => setIsAddOpen(true)}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition cursor-pointer shadow-md"
              title="Schedule Study Event"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View grids */}
        <div className="flex-1 overflow-hidden">
          {viewType === "month" && (
            <div className="h-full flex flex-col">
              <div className="grid grid-cols-7 text-center font-bold text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day}>{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 grid-rows-6 flex-1 gap-1.5">
                {monthDays.map((slot, idx) => {
                  const dateStr = toLocalDateStr(slot.date);
                  const dayEvents = events.filter(e => e.date === dateStr);
                  const isSelected = selectedDateStr === dateStr;
                  const isToday = todayStr === dateStr;

                  return (
                    <button
                      key={dateStr + idx}
                      onClick={() => setSelectedDateStr(dateStr)}
                      className={`relative flex flex-col justify-between p-2 rounded-2xl text-left border transition-all cursor-pointer ${
                        isSelected 
                          ? "border-indigo-500 bg-indigo-500/[0.03] ring-1 ring-indigo-500" 
                          : "border-[var(--border-subtle)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)]"
                      } ${!slot.isCurrentMonth ? "opacity-35" : ""}`}
                    >
                      <span className={`text-[10px] font-black font-mono w-5 h-5 rounded-full flex items-center justify-center ${isToday ? 'bg-indigo-600 text-white' : 'text-[var(--text-secondary)]'}`}>
                        {slot.date.getDate()}
                      </span>
                      
                      {dayEvents.length > 0 && (
                        <div className="flex gap-1 mt-auto flex-wrap max-h-[14px] overflow-hidden">
                          {dayEvents.slice(0, 3).map(e => (
                            <span 
                              key={e.id} 
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: e.color || "#6366f1" }}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-[7px] font-bold text-[var(--text-muted)] leading-none font-mono">+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {viewType === "week" && (
            <div className="h-full grid grid-cols-7 gap-2">
              {weekDays.map((day, idx) => {
                const dateStr = toLocalDateStr(day);
                const dayEvents = events.filter(e => e.date === dateStr);
                const isSelected = selectedDateStr === dateStr;
                const isToday = todayStr === dateStr;

                return (
                  <div 
                    key={dateStr + idx}
                    className={`flex flex-col rounded-2xl border p-3 h-full overflow-hidden transition-all ${
                      isSelected 
                        ? "border-indigo-500 bg-indigo-500/[0.02]" 
                        : "border-[var(--border-subtle)] bg-[var(--surface-secondary)]/30"
                    }`}
                  >
                    <button 
                      onClick={() => setSelectedDateStr(dateStr)}
                      className="w-full text-left mb-3 cursor-pointer"
                    >
                      <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider">
                        {day.toLocaleDateString(undefined, { weekday: "short" })}
                      </p>
                      <p className={`text-base font-black font-mono mt-0.5 w-6 h-6 rounded-full flex items-center justify-center ${isToday ? 'bg-indigo-600 text-white' : 'text-[var(--text-primary)]'}`}>
                        {day.getDate()}
                      </p>
                    </button>

                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                      {dayEvents.map(e => (
                        <div 
                          key={e.id}
                          onClick={() => setSelectedDateStr(dateStr)}
                          className="p-2 border rounded-xl text-[10px] font-bold leading-normal truncate cursor-pointer shadow-sm bg-[var(--surface)] hover:scale-[1.02] transition-transform"
                          style={{ borderLeft: `3px solid ${e.color || '#6366f1'}` }}
                        >
                          {e.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewType === "day" && (
            <div className="h-full flex flex-col overflow-y-auto custom-scrollbar pr-1">
              <div className="space-y-3">
                {events
                  .filter(e => e.date === toLocalDateStr(currentDate))
                  .sort((a,b) => (a.startTime || "10:00").localeCompare(b.startTime || "10:00"))
                  .map(e => (
                    <div 
                      key={e.id} 
                      className="p-4 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-2xl flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: e.color || '#6366f1' }} />
                        <div>
                          <h4 className={`font-bold text-sm text-[var(--text-primary)] ${e.completed ? 'line-through opacity-40' : ''}`}>
                            {e.title}
                          </h4>
                          <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">
                            {formatTime12h(e.startTime || "10:00")} {e.endTime ? `to ${formatTime12h(e.endTime)}` : ""} • {e.studyType}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleLaunchEvent(e)}
                          className="p-2 hover:bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl text-indigo-500 transition-colors cursor-pointer"
                          title="Quick Launch Test Engine"
                        >
                          <Play className="w-3.5 h-3.5 fill-indigo-500 stroke-none" />
                        </button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: High Fidelity Planner widgets / Details Sidebar */}
      <div className="lg:col-span-4 bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-5 shadow-sm flex flex-col h-[560px] overflow-hidden divide-y divide-[var(--border)]">
        
        {/* Schedule preview header */}
        <div className="flex-none pb-4">
          <div className="flex justify-between items-baseline">
            <h4 className="font-extrabold text-xs uppercase tracking-widest text-[var(--text-muted)]">
              Tasks: {new Date(selectedDateStr + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </h4>
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono">
              {selectedDayEvents.length} Scheduled
            </span>
          </div>
        </div>

        {/* Selected date events */}
        <div className="flex-1 overflow-y-auto py-4 pr-1 -mr-1 custom-scrollbar space-y-3">
          {selectedDayEvents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[var(--text-secondary)]">
              <CalendarRange className="w-10 h-10 mb-2 text-gray-300 dark:text-gray-700" />
              <p className="text-xs font-semibold">No planned tasks scheduled.</p>
            </div>
          ) : (
            selectedDayEvents.map(e => (
              <div 
                key={e.id}
                className="p-4 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-2xl flex flex-col justify-between gap-3 shadow-sm hover:border-[var(--border)] transition-colors group relative"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${priorityColors[e.priority || "Medium"]}`}>
                        {e.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${statusColors[e.status || "Pending"]}`}>
                        {e.status}
                      </span>
                      {e.difficulty && (
                        <span className="bg-slate-100 dark:bg-slate-800 border border-[var(--border-subtle)] text-[8px] font-black uppercase tracking-wider text-[var(--text-secondary)] px-2 py-0.5 rounded">
                          {e.difficulty}
                        </span>
                      )}
                    </div>
                    
                    <h5 className={`font-bold text-xs text-[var(--text-primary)] leading-normal ${e.completed ? 'line-through text-[var(--text-muted)]' : ''}`}>
                      {e.title}
                    </h5>
                    <p className="text-[10px] text-[var(--text-secondary)] font-medium mt-1 leading-normal">
                      {e.description || "No description provided."}
                    </p>
                    
                    {/* Metadata indicators (Subject/Topic) */}
                    {(e.subject || e.topic) && (
                      <div className="mt-2 flex items-center gap-2 text-[9px] font-semibold text-[var(--text-muted)] flex-wrap">
                        {e.subject && <span className="bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-1.5 py-0.5 rounded">{e.subject}</span>}
                        {e.topic && <span className="text-[var(--text-secondary)]">/ {e.topic}</span>}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => handleDeleteEvent(e.id)}
                    className="absolute top-4 right-4 p-1 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-500 rounded-lg transition opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex justify-between items-center mt-2 pt-2 border-t border-[var(--border-subtle)]/50">
                  <div className="flex items-center gap-2 text-[9px] text-[var(--text-secondary)] font-bold font-mono">
                    <Clock3 className="w-3 h-3 text-[var(--text-muted)]" />
                    <span>{formatTime12h(e.startTime || "10:00")}{e.endTime ? ` - ${formatTime12h(e.endTime)}` : ""}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Status selection popover dropdown to track states */}
                    <select
                      value={e.status || "Pending"}
                      onChange={(ev) => handleStatusChange(e.id, ev.target.value as any)}
                      className="text-[9px] font-bold bg-[var(--surface)] border border-[var(--border)] rounded-md px-1.5 py-0.5 outline-none text-[var(--text-secondary)] cursor-pointer"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Skipped">Skipped</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>

                    {/* Launch Engine */}
                    <button
                      onClick={() => handleLaunchEvent(e)}
                      className="p-1 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-indigo-200/50 rounded-lg text-indigo-500 transition-colors cursor-pointer"
                      title="Launch Study Target"
                    >
                      <Play className="w-3 h-3 fill-indigo-500 stroke-none" />
                    </button>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>

        {/* Overdue/Pending summary metrics */}
        <div className="flex-none pt-4 bg-[var(--surface-secondary)]/10">
          <div className="grid grid-cols-3 gap-2 text-center text-[9px] font-black uppercase text-[var(--text-secondary)] tracking-wider">
            <div className="bg-[var(--surface-secondary)] border border-[var(--border-subtle)] p-2 rounded-xl">
              <span className="block text-rose-500 text-sm font-black font-mono">{stats.overdue.length}</span>
              <span>Overdue</span>
            </div>
            <div className="bg-[var(--surface-secondary)] border border-[var(--border-subtle)] p-2 rounded-xl">
              <span className="block text-indigo-500 text-sm font-black font-mono">{stats.pendingToday}</span>
              <span>Pending Today</span>
            </div>
            <div className="bg-[var(--surface-secondary)] border border-[var(--border-subtle)] p-2 rounded-xl">
              <span className="block text-emerald-500 text-sm font-black font-mono">{stats.completedToday}</span>
              <span>Solved Today</span>
            </div>
          </div>
        </div>

      </div>

      {/* ADD/CREATE PLAN EVENT DIALOG — portaled to body; this component is often rendered
          inside a hover-transformed card, which would otherwise hijack position:fixed. */}
      {mounted && createPortal(
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-2xl p-6 overflow-hidden z-10 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <h4 className="font-extrabold text-base text-[var(--text-primary)] mb-5">Create Planned Study Event</h4>
              
              <form onSubmit={handleAddEvent} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Study Title</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Revision: Algorithms & Data Structs"
                    value={newEvent.title}
                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full p-3 bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Study Type</label>
                    <select 
                      value={newEvent.studyType}
                      onChange={e => setNewEvent({ ...newEvent, studyType: e.target.value as any })}
                      className="w-full p-3 bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    >
                      <option value="Study">Study</option>
                      <option value="Revision">Revision</option>
                      <option value="Mock Test">Mock Test</option>
                      <option value="Custom Test">Custom Test</option>
                      <option value="Mistakes">Mistakes Review</option>
                      <option value="Bookmarks">Bookmarks Review</option>
                      <option value="Weak Topics">Weak Topics Practice</option>
                      <option value="Random Practice">Random Practice</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Priority</label>
                    <select 
                      value={newEvent.priority}
                      onChange={e => setNewEvent({ ...newEvent, priority: e.target.value as any })}
                      className="w-full p-3 bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Subject</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Core CS"
                      value={newEvent.subject}
                      onChange={e => setNewEvent({ ...newEvent, subject: e.target.value })}
                      className="w-full p-2.5 bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded-xl outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Topic</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Graph Search"
                      value={newEvent.topic}
                      onChange={e => setNewEvent({ ...newEvent, topic: e.target.value })}
                      className="w-full p-2.5 bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded-xl outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Section</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Section A"
                      value={newEvent.section}
                      onChange={e => setNewEvent({ ...newEvent, section: e.target.value })}
                      className="w-full p-2.5 bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Difficulty</label>
                    <select 
                      value={newEvent.difficulty}
                      onChange={e => setNewEvent({ ...newEvent, difficulty: e.target.value as any })}
                      className="w-full p-2.5 bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded-xl outline-none"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Target Questions</label>
                    <input 
                      type="number" 
                      value={newEvent.targetQuestions}
                      onChange={e => setNewEvent({ ...newEvent, targetQuestions: Number(e.target.value) })}
                      className="w-full p-2.5 bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded-xl outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Revision Cycle</label>
                    <select 
                      value={newEvent.revisionCycle}
                      onChange={e => setNewEvent({ ...newEvent, revisionCycle: e.target.value as any })}
                      className="w-full p-2.5 bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded-xl outline-none"
                    >
                      <option value="One Time">One Time</option>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Every 3 Days">Every 3 Days</option>
                      <option value="Every 7 Days">Every 7 Days</option>
                      <option value="Every 14 Days">Every 14 Days</option>
                      <option value="Every Month">Every Month</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Date</label>
                    <input 
                      type="date" 
                      value={newEvent.date}
                      onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                      className="w-full p-3 bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Time Range Mode</label>
                    <select 
                      value={newEvent.timeRangeType}
                      onChange={e => setNewEvent({ ...newEvent, timeRangeType: e.target.value as any })}
                      className="w-full p-3 bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    >
                      <option value="date_only">Date Only (No Time)</option>
                      <option value="start_time">Date + Start Time</option>
                      <option value="start_end">Date + Start & End Time</option>
                      <option value="duration">Date + Start Time + Duration</option>
                    </select>
                  </div>
                </div>

                {newEvent.timeRangeType !== "date_only" && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Start Time</label>
                      <input 
                        type="time" 
                        value={newEvent.startTime}
                        onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })}
                        className="w-full p-2.5 bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded-xl outline-none"
                      />
                    </div>
                    {newEvent.timeRangeType === "start_end" && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">End Time</label>
                        <input 
                          type="time" 
                          value={newEvent.endTime}
                          onChange={e => setNewEvent({ ...newEvent, endTime: e.target.value })}
                          className="w-full p-2.5 bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded-xl outline-none"
                        />
                      </div>
                    )}
                    {(newEvent.timeRangeType === "duration" || newEvent.timeRangeType === "start_end") && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Duration (Mins)</label>
                        <input 
                          type="number" 
                          value={newEvent.durationMin}
                          onChange={e => setNewEvent({ ...newEvent, durationMin: Number(e.target.value) })}
                          className="w-full p-2.5 bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded-xl outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Notes / Instructions</label>
                  <textarea 
                    placeholder="Provide additional study notes or checklist..."
                    value={newEvent.notes}
                    onChange={e => setNewEvent({ ...newEvent, notes: e.target.value })}
                    className="w-full p-3 bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none h-16"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="reminderToggle"
                      checked={newEvent.reminderToggle}
                      onChange={e => setNewEvent({ ...newEvent, reminderToggle: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="reminderToggle" className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] cursor-pointer">
                      Enable Reminder
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsAddOpen(false)}
                      className="px-4 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-var(--text-primary) text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-lg shadow-indigo-500/10"
                    >
                      Add Event
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
      )}

    </div>
  );
}
