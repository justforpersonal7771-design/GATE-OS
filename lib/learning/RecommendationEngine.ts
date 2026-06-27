import { RenderableQuestion } from "@/types/question.types";
import { MistakeEntry, BookmarkEntry } from "@/types/study.types";
import { TopicMastery } from "./MasteryEngine";
import { CalendarEvent } from "@/types/calendar.types";

export class RecommendationEngine {
  public static generateRecommendations(
    allQuestions: RenderableQuestion[],
    mistakes: MistakeEntry[],
    bookmarks: BookmarkEntry[],
    topicMastery: Record<string, TopicMastery>,
    calendarEvents: CalendarEvent[],
    weakestSubject: string
  ) {
    // 1. "Today's Focus" recommendation
    // Find the weakest topic in the weakest subject, or fallback to the weakest topic overall
    const topicsList = Object.values(topicMastery);
    let focusTopic = "";
    let focusReason = "";

    const weakestSubjectTopics = topicsList.filter(t => t.subject === weakestSubject);
    const candidateTopics = weakestSubjectTopics.length > 0 ? weakestSubjectTopics : topicsList;

    if (candidateTopics.length > 0) {
      // Sort candidates by score ascending (lowest score first)
      const sortedCandidates = [...candidateTopics].sort((a, b) => a.score - b.score);
      
      // Select lowest score candidate
      const target = sortedCandidates[0];
      
      // Check if they have open mistakes
      const openMistakesCount = mistakes.filter(m => m.topic === target.topic && !m.mastered).length;
      focusTopic = target.topic;
      
      if (openMistakesCount > 0) {
        focusReason = `Contains ${openMistakesCount} unresolved mistakes. Focus on correction.`;
      } else if (target.totalAttempts === 0) {
        focusReason = `Not studied yet. Start with basic exercises to build confidence.`;
      } else {
        focusReason = `Topic mastery stands at ${target.score}%. Resolve weak concepts to improve score.`;
      }
    } else {
      focusTopic = "Algorithms";
      focusReason = "Core CSE topic. Build daily coding habits.";
    }

    // 2. "Today's Target" recommendation
    // Look at today's calendar event, or generate dynamic target based on mistakes/bookmarks
    const todayStr = new Date().toISOString().split("T")[0];
    const todayEvents = calendarEvents.filter(e => e.date === todayStr && !e.completed);
    
    let targetTitle = "Practice Sessions";
    let targetCount = 15;
    let targetReason = "Standard daily goal to maintain active practice streak.";

    if (todayEvents.length > 0) {
      const activeEvent = todayEvents[0];
      targetTitle = activeEvent.title;
      targetCount = activeEvent.targetQuestions || 20;
      targetReason = `Scheduled plan: "${activeEvent.title}" (${activeEvent.priority} Priority).`;
    } else {
      // Dynamic fallback
      const totalUnresolvedMistakes = mistakes.filter(m => !m.mastered).length;
      if (totalUnresolvedMistakes > 5) {
        targetTitle = "Resolve Mistakes Bank";
        targetCount = Math.min(10, totalUnresolvedMistakes);
        targetReason = `Clear pending mistakes. Retry ${targetCount} items today.`;
      } else if (bookmarks.length > 3) {
        targetTitle = "Review Bookmarks";
        targetCount = Math.min(8, bookmarks.length);
        targetReason = `Analyze bookmarked items to cement core formulas.`;
      }
    }

    return {
      todaysFocus: {
        topic: focusTopic,
        reason: focusReason
      },
      todaysTarget: {
        title: targetTitle,
        count: targetCount,
        reason: targetReason
      }
    };
  }
}
