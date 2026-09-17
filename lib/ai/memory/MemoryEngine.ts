import { KnowledgeGraph } from "./KnowledgeGraph";
import { LearningMemory, LearningInteraction } from "./LearningMemory";
import { InsightMemory, MistakePattern } from "./InsightMemory";
import { ConversationMemory } from "./ConversationMemory";

export interface LearnerTimelineMilestone {
  id: string;
  timestamp: string;
  type: "Started Topic" | "First Mistake" | "Mastery achieved" | "Bookmark Added" | "Revision Attempt" | "Mock Session" | "AI Insight" | "Confidence Boost";
  title: string;
  description: string;
  topic?: string;
  subject?: string;
  metric?: string;
}

export interface ReadinessScorecard {
  expectedMarks: number; // Out of 100
  expectedRank: number;  // Predicted rank out of estimated candidates
  confidenceInterval: [number, number];
  readinessRating: "Excellent" | "High" | "Moderate" | "Critical";
  revisionCompletionDate: string;
  suggestedMockDate: string;
  velocityScore: number; // Score 0-100 indicating learning rate
  burnoutRisk: "Low" | "Moderate" | "High";
}

export class MemoryEngine {
  /**
   * Initializes all memory layers.
   */
  public static async initialize(): Promise<void> {
    await Promise.all([
      LearningMemory.load(),
      InsightMemory.load()
    ]);
  }

  /**
   * Generate prioritized revision queue weights.
   * Scrapes mastery percentages, confidence indexes, mistake counts, and spacing intervals to re-prioritize items.
   */
  public static calculateRevisionPriority(
    topic: string,
    stats: {
      occurrences: number;
      retryCount: number;
      masteryIndex: number;
      confidence: number;
      lastAttemptDaysAgo: number;
    }
  ): number {
    // Priority formula logic:
    // Base weight starts at 50
    let score = 50;

    // 1. High occurrences (more errors) increases priority
    score += Math.min(25, stats.occurrences * 5);

    // 2. Low confidence increases priority
    score += Math.min(20, (100 - stats.confidence) * 0.25);

    // 3. Spaced Repetition interval weight: longer wait increases priority
    score += Math.min(20, stats.lastAttemptDaysAgo * 2.5);

    // 4. Mastery decreases priority
    score -= Math.min(35, stats.masteryIndex * 0.35);

    return Math.max(1, Math.min(100, Math.round(score)));
  }

  /**
   * AI Exam Readiness Predictor calculations.
   */
  public static predictExamReadiness(
    subjectMasteryList: { subject: string; masteryIndex: number; averageConfidence: number }[],
    totalQuestionsSolved: number,
    correctAccuracy: number, // percentage (0-100)
    plannerCompletionRate: number // percentage (0-100)
  ): ReadinessScorecard {
    const averageMastery = subjectMasteryList.length > 0 
      ? subjectMasteryList.reduce((acc, s) => acc + s.masteryIndex, 0) / subjectMasteryList.length
      : 0;

    const averageConfidence = subjectMasteryList.length > 0
      ? subjectMasteryList.reduce((acc, s) => acc + s.averageConfidence, 0) / subjectMasteryList.length
      : 0;

    // 1. Predict expected marks: base marks depend on coverage (mastery) and accuracy
    let predictedMarks = (averageMastery * 0.5) + (correctAccuracy * 0.35) + (plannerCompletionRate * 0.15);
    predictedMarks = Math.max(15, Math.min(95, predictedMarks)); // Cap expected marks between 15 and 95

    // 2. Predict rank: based on estimated candidate pool performance maps
    let predictedRank = 10000;
    if (predictedMarks >= 85) predictedRank = Math.round(5 + (90 - predictedMarks) * 8);
    else if (predictedMarks >= 70) predictedRank = Math.round(100 + (85 - predictedMarks) * 60);
    else if (predictedMarks >= 50) predictedRank = Math.round(1000 + (70 - predictedMarks) * 450);
    else predictedRank = Math.round(10000 + (50 - predictedMarks) * 1200);
    predictedRank = Math.max(1, predictedRank);

    // 3. Velocity score (questions solved per day equivalent)
    const velocityScore = Math.min(100, Math.round((totalQuestionsSolved / 250) * 100));

    // 4. Burnout risk analysis
    let burnoutRisk: "Low" | "Moderate" | "High" = "Low";
    if (totalQuestionsSolved > 400 && plannerCompletionRate > 90) burnoutRisk = "High";
    else if (totalQuestionsSolved > 200) burnoutRisk = "Moderate";

    // 5. Suggested Dates
    const suggestedMockDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const revisionCompletionDate = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" });

    // Readiness rating
    let readinessRating: "Excellent" | "High" | "Moderate" | "Critical" = "Moderate";
    if (predictedMarks > 75) readinessRating = "Excellent";
    else if (predictedMarks > 60) readinessRating = "High";
    else if (predictedMarks < 40) readinessRating = "Critical";

    return {
      expectedMarks: Math.round(predictedMarks * 100) / 100,
      expectedRank: predictedRank,
      confidenceInterval: [Math.max(0, Math.round(predictedMarks - 6)), Math.min(100, Math.round(predictedMarks + 4))],
      readinessRating,
      revisionCompletionDate,
      suggestedMockDate,
      velocityScore,
      burnoutRisk
    };
  }

  /**
   * Reconstruct study milestones timeline journey.
   */
  public static async getLearnerTimeline(
    bookmarks: any[],
    mistakes: any[]
  ): Promise<LearnerTimelineMilestone[]> {
    const milestones: LearnerTimelineMilestone[] = [];
    const interactions = await LearningMemory.getAllInteractions();

    // 1. Map interactions milestones
    interactions.forEach((item, idx) => {
      if (idx === 0) {
        milestones.push({
          id: `milestone_start_${item.questionId}`,
          timestamp: item.timestamp,
          type: "Started Topic",
          title: `Initiated topic review`,
          description: `You started actively learning ${item.topic} in ${item.subject}.`,
          topic: item.topic,
          subject: item.subject
        });
      }
      
      if (
        item.confidenceAfter !== undefined &&
        item.confidenceBefore !== undefined &&
        item.confidenceAfter > item.confidenceBefore + 15
      ) {
        milestones.push({
          id: `milestone_conf_${idx}`,
          timestamp: item.timestamp,
          type: "Confidence Boost",
          title: "Confidence jump detected",
          description: `Your confidence rating in ${item.topic} improved from ${item.confidenceBefore}% to ${item.confidenceAfter}%.`,
          topic: item.topic,
          subject: item.subject,
          metric: `+${item.confidenceAfter - item.confidenceBefore}%`
        });
      }
    });

    // 2. Map bookmarks milestones
    bookmarks.forEach((b, idx) => {
      milestones.push({
        id: `milestone_bookmark_${b.questionId}_${idx}`,
        timestamp: b.createdAt || new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        type: "Bookmark Added",
        title: "Saved question in bookmarks",
        description: `You bookmarked a tricky question inside the topic "${b.topic}".`,
        topic: b.topic,
        subject: b.subject
      });
    });

    // 3. Map mistakes milestones
    mistakes.forEach((m, idx) => {
      if (m.mastered) {
        milestones.push({
          id: `milestone_mastery_${m.questionId}_${idx}`,
          timestamp: m.updatedAt || new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          type: "Mastery achieved",
          title: "Achieved topic mastery",
          description: `You successfully mastered the mistake question on "${m.topic}" after completing multiple reviews!`,
          topic: m.topic,
          subject: m.subject
        });
      } else if (m.occurrences >= 2) {
        milestones.push({
          id: `milestone_mistake_${m.questionId}_${idx}`,
          timestamp: m.createdAt || new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          type: "First Mistake",
          title: "Struggling topic alert",
          description: `A recurring error pattern has been registered under the topic "${m.topic}".`,
          topic: m.topic,
          subject: m.subject
        });
      }
    });

    // Sort milestones chronologically (most recent first)
    return milestones.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}
export { KnowledgeGraph, LearningMemory, InsightMemory, ConversationMemory };
export type { MistakePattern } from "./InsightMemory";
export type { LearningInteraction } from "./LearningMemory";
