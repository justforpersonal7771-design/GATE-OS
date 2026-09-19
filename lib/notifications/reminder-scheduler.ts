import { IDBManager } from "@/lib/repository/storage/idb-manager";
import { toLocalDateStr } from "@/lib/utils";

const FIRED_KEY = "gateos_fired_reminders";

function getFiredSet(): Set<string> {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markFired(id: string) {
  try {
    const fired = getFiredSet();
    fired.add(id);
    localStorage.setItem(FIRED_KEY, JSON.stringify([...fired]));
  } catch {
    // best-effort only; a missed dedupe just risks one duplicate notification
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

// Checks every scheduled study event with an enabled reminder against the current
// time, firing a browser Notification once per event/day. Deliberately fully opt-in:
// an event with no startTime or reminderToggle unset never fires anything.
export async function checkDueReminders(): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const events = await IDBManager.getCalendarEvents();
  const todayStr = toLocalDateStr();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const fired = getFiredSet();

  for (const event of events as any[]) {
    if (!event.reminderToggle || !event.startTime) continue;
    if (event.date !== todayStr) continue;
    if (event.status === "Completed" || event.status === "Cancelled" || event.completed) continue;

    const dedupeId = `${event.id}_${todayStr}`;
    if (fired.has(dedupeId)) continue;

    const [h, m] = String(event.startTime).split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) continue;
    const eventMinutes = h * 60 + m;

    // Fire once the scheduled time has arrived, within a 5-minute catch-up window
    // so a backgrounded/minimized tab doesn't miss it entirely.
    if (nowMinutes >= eventMinutes && nowMinutes - eventMinutes <= 5) {
      markFired(dedupeId);
      new Notification(`Study Reminder: ${event.title}`, {
        body: event.description || `Scheduled ${event.studyType || "study"} session`,
        tag: dedupeId,
        icon: "/images/logo-192.png",
      });
    }
  }
}
