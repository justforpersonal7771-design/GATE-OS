import { create } from "zustand";
import { IDBManager } from "@/lib/repository/storage/idb-manager";
import { CalendarEvent } from "@/types/calendar.types";

interface CalendarState {
  events: CalendarEvent[];
  loading: boolean;
  loaded: boolean;
  loadEvents: () => Promise<void>;
  addEvent: (event: CalendarEvent) => Promise<void>;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

// Calendar events are still persisted as a single JSON blob under the
// Metadata store (see IDBManager.getCalendarEvents/saveCalendarEvents) — this
// store exists so every screen that reads/writes calendar data (the Topbar
// quick panel, the full /calendar planner) shares one live, reactive copy
// instead of each doing its own out-of-sync IDB round trip.
export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  loading: false,
  loaded: false,

  loadEvents: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    try {
      const data = await IDBManager.getCalendarEvents();
      // Migrate older events saved before the Study Schedule Engine fields existed.
      const migrated: CalendarEvent[] = data.map((e: any) => ({
        ...e,
        studyType: e.studyType || "Study",
        revisionCycle: e.revisionCycle || "One Time",
        status: e.status || (e.completed ? "Completed" : "Pending"),
        timeRangeType: e.timeRangeType || "start_time",
        startTime: e.startTime || e.time || "10:00",
      }));
      set({ events: migrated, loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  addEvent: async (event) => {
    const updated = [...get().events, event];
    set({ events: updated });
    await IDBManager.saveCalendarEvents(updated);
  },

  updateEvent: async (id, patch) => {
    const updated = get().events.map(e => (e.id === id ? { ...e, ...patch } : e));
    set({ events: updated });
    await IDBManager.saveCalendarEvents(updated);
  },

  deleteEvent: async (id) => {
    const updated = get().events.filter(e => e.id !== id);
    set({ events: updated });
    await IDBManager.saveCalendarEvents(updated);
  },
}));
