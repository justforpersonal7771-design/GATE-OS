import { MemoryEngine } from "./MemoryEngine";
import { CalendarEvent } from "@/types/calendar.types";
import { toLocalDateStr } from "@/lib/utils";

export interface StudyPlanSuggestion {
  id: string;
  title: string;
  reason: string;
  studyType: CalendarEvent["studyType"];
  subject?: string;
  topic?: string;
  priority: "Low" | "Medium" | "High";
  suggestedDate: string; // YYYY-MM-DD
}

interface MistakeLike {
  topic: string;
  subject: string;
  mastered: boolean;
  occurrences?: number;
  retryCount?: number;
  mastery?: number;
  confidence?: number;
  lastSeen?: string;
}

/**
 * Rule-based (not a live AI call — zero marginal cost, matches the rest of
 * the memory layer) study-plan recommender. Every suggestion is derived
 * from real recorded mistakes/mastery data; nothing here is fabricated.
 * Calendar entries are only ever created when the student explicitly clicks
 * "Add to Calendar" on a suggestion — this never writes to the planner
 * automatically.
 */
export class StudyPlanEngine {
  public static generateSuggestions(params: {
    mistakes: MistakeLike[];
    topicMasteryMap: Record<string, { score: number }>;
    burnoutRisk: "Low" | "Moderate" | "High";
    existingEvents: CalendarEvent[];
  }): StudyPlanSuggestion[] {
    const { mistakes, topicMasteryMap, burnoutRisk, existingEvents } = params;
    const suggestions: StudyPlanSuggestion[] = [];
    const today = toLocalDateStr();
    const scheduledTopics = new Set(
      existingEvents.filter(e => e.date >= today && e.status !== "Completed").map(e => e.topic).filter(Boolean)
    );

    const pendingMistakes = mistakes.filter(m => !m.mastered);

    if (pendingMistakes.length === 0) {
      // No recorded weaknesses yet — the one honest recommendation is to
      // generate a baseline data point, not to invent a "weak topic".
      suggestions.push({
        id: "sug_diagnostic",
        title: "Diagnostic Mock Test",
        reason: "No mistakes recorded yet, so there's nothing to target revision at. A short mock test gives the mentor real data to work from.",
        studyType: "Mock Test",
        priority: "Medium",
        suggestedDate: today,
      });
      return suggestions;
    }

    // Group pending mistakes by topic and compute a revision-priority score
    // per topic using the same formula the Revision engine already uses.
    const byTopic = new Map<string, MistakeLike[]>();
    pendingMistakes.forEach(m => {
      const list = byTopic.get(m.topic) || [];
      list.push(m);
      byTopic.set(m.topic, list);
    });

    const scoredTopics = Array.from(byTopic.entries()).map(([topic, group]) => {
      const occurrences = group.reduce((acc, m) => acc + (m.occurrences || 1), 0);
      const retryCount = Math.round(group.reduce((acc, m) => acc + (m.retryCount || 0), 0) / group.length);
      const masteryIndex = topicMasteryMap[topic]?.score ?? group.reduce((acc, m) => acc + (m.mastery || 0), 0) / group.length;
      const confidence = group.reduce((acc, m) => acc + (m.confidence ?? 50), 0) / group.length;
      const lastSeenDates = group.map(m => m.lastSeen ? new Date(m.lastSeen).getTime() : 0).filter(t => t > 0);
      const mostRecentMs = lastSeenDates.length > 0 ? Math.max(...lastSeenDates) : 0;
      const lastAttemptDaysAgo = mostRecentMs > 0 ? Math.round((Date.now() - mostRecentMs) / (1000 * 60 * 60 * 24)) : 14;

      const score = MemoryEngine.calculateRevisionPriority(topic, {
        occurrences, retryCount, masteryIndex, confidence, lastAttemptDaysAgo,
      });

      return { topic, subject: group[0].subject, score, occurrences };
    }).sort((a, b) => b.score - a.score);

    // Burnout-aware pacing: fewer new suggestions when burnout risk is high.
    const maxTopics = burnoutRisk === "High" ? 1 : burnoutRisk === "Moderate" ? 2 : 3;
    const topTopics = scoredTopics.filter(t => !scheduledTopics.has(t.topic)).slice(0, maxTopics);

    topTopics.forEach((t, idx) => {
      const dateOffset = idx; // spread across today, +1, +2
      const date = toLocalDateStr(new Date(Date.now() + dateOffset * 24 * 60 * 60 * 1000));
      suggestions.push({
        id: `sug_revise_${t.topic}`,
        title: `Revise: ${t.topic}`,
        reason: `${t.occurrences} unresolved mistake${t.occurrences === 1 ? "" : "s"} recorded in this topic.`,
        studyType: "Revision",
        subject: t.subject,
        topic: t.topic,
        priority: t.score >= 70 ? "High" : t.score >= 40 ? "Medium" : "Low",
        suggestedDate: date,
      });
    });

    // A dedicated mistakes-review sweep once the pending queue gets large.
    if (pendingMistakes.length >= 8 && !existingEvents.some(e => e.studyType === "Mistakes" && e.date >= today && e.status !== "Completed")) {
      suggestions.push({
        id: "sug_mistakes_sweep",
        title: `Resolve Mistakes Bank (${pendingMistakes.length} pending)`,
        reason: `${pendingMistakes.length} unmastered mistakes have built up across all topics.`,
        studyType: "Mistakes",
        priority: pendingMistakes.length >= 15 ? "High" : "Medium",
        suggestedDate: toLocalDateStr(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)),
      });
    }

    return suggestions;
  }
}
