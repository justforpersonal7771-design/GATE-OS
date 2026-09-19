import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a Date as YYYY-MM-DD using LOCAL calendar fields, not UTC.
 * Never use `date.toISOString().split("T")[0]` for day-bucketing — it
 * silently shifts the date by a day for any timezone ahead of UTC (e.g.
 * IST, GATE's whole audience), since local midnight converts to the
 * previous day's evening in UTC.
 */
export function toLocalDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Formats a stored "HH:MM" (24hr, from <input type="time">) as 12hr with AM/PM, e.g.
 * "14:30" -> "2:30 PM". Passes through anything that isn't a plain HH:MM string unchanged. */
export function formatTime12h(time?: string | null): string {
  if (!time) return "";
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return time;
  const hours24 = parseInt(match[1], 10);
  const minutes = match[2];
  if (Number.isNaN(hours24) || hours24 < 0 || hours24 > 23) return time;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes} ${period}`;
}
