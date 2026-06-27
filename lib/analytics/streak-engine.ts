import { ExamSession } from "@/types/exam-runtime.types";

export class StreakEngine {
  public static calculateStreak(sessions: ExamSession[]): {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string | null;
  } {
    if (!sessions || sessions.length === 0) {
      return { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
    }

    // Extract unique dates of completed or paused sessions.
    // Strictly speaking, any session shows activity.
    const activeDates = new Set<string>();

    sessions.forEach(session => {
      if (session.startedAt) {
        const dateStr = new Date(session.startedAt).toISOString().split("T")[0];
        activeDates.add(dateStr);
      }
    });

    const sortedDates = Array.from(activeDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    if (sortedDates.length === 0) {
      return { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
    }

    const lastActiveDate = sortedDates[0];
    
    let longestStreak = 0;
    let currentStreakCounter = 1;
    let maxFoundStreak = 1;

    for (let i = 0; i < sortedDates.length - 1; i++) {
      const curr = new Date(sortedDates[i]);
      const prev = new Date(sortedDates[i + 1]);
      
      const diffTime = Math.abs(curr.getTime() - prev.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreakCounter++;
        maxFoundStreak = Math.max(maxFoundStreak, currentStreakCounter);
      } else if (diffDays > 1) {
        currentStreakCounter = 1;
      }
    }

    longestStreak = maxFoundStreak;

    // To calculate CURRENT streak relative to TODAY
    const today = new Date().toISOString().split("T")[0];
    const todayDate = new Date(today);
    const lastActive = new Date(lastActiveDate);

    const diffToToday = Math.floor((todayDate.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    let currentStreak = 0;
    
    // If the last active date is today or yesterday, the streak is ongoing
    if (diffToToday <= 1) {
      // Recalculate streak length
      currentStreak = 1;
      for (let i = 0; i < sortedDates.length - 1; i++) {
        const curr = new Date(sortedDates[i]);
        const prev = new Date(sortedDates[i + 1]);
        
        const diffTime = Math.abs(curr.getTime() - prev.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    } else {
      currentStreak = 0;
    }

    return {
      currentStreak,
      longestStreak,
      lastActiveDate
    };
  }
}
