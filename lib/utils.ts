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
