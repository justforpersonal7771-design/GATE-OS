import { RenderableQuestion } from "@/types/question.types";
import { MistakeEntry, BookmarkEntry } from "@/types/study.types";
import { GoalTag } from "@/types/exam.types";
import { toLocalDateStr } from "@/lib/utils";

export interface AdaptiveRevisionItem {
  id: string; // questionId
  question: RenderableQuestion;
  type: 'Mistake' | 'Bookmark';
  priority: 'Very High Priority' | 'High' | 'Medium' | 'Low' | 'Completed';
  priorityScore: number;
  reason: string;
  estimatedTimeMin: number;
  confidencePercent: number;
  revisionCount: number;
  lastRevised: string | null;
  nextSuggestedRevision: string;
  sourceGoalTag?: GoalTag;
}

export class AdaptiveEngine {
  public static generateRevisionQueue(
    allQuestions: RenderableQuestion[],
    mistakes: MistakeEntry[],
    bookmarks: BookmarkEntry[]
  ): AdaptiveRevisionItem[] {
    const now = new Date();
    const queue: AdaptiveRevisionItem[] = [];

    // Map unique questions that are in mistakes or bookmarks
    const uniqueIds = new Set([
      ...mistakes.map(m => m.questionId),
      ...bookmarks.map(b => b.questionId)
    ]);

    uniqueIds.forEach(qid => {
      const question = allQuestions.find(q => q.question_id === qid);
      if (!question) return;

      const mistake = mistakes.find(m => m.questionId === qid);
      const bookmark = bookmarks.find(b => b.questionId === qid);

      // 1. Calculate Mistake Frequency & Solved Counts
      const occurrences = mistake?.occurrences || (mistake ? 1 : 0);
      const solvedCount = mistake?.solvedCount || 0;
      const revisionCount = mistake?.reviewCount || (bookmark ? 1 : 0);
      
      // 2. Last solved date and recency decay
      const lastRevisedStr = mistake?.lastReviewed || bookmark?.createdAt || null;
      let daysSinceLastAttempt = 30; // default to 30 days if never attempted
      
      if (lastRevisedStr) {
        const lastDate = new Date(lastRevisedStr);
        const diffMs = now.getTime() - lastDate.getTime();
        daysSinceLastAttempt = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      // 3. Difficulty weights
      let diffWeight = 2; // Medium
      const diffStr = String(question.difficulty).toLowerCase();
      if (diffStr.includes("easy")) diffWeight = 1;
      if (diffStr.includes("hard") || diffStr.includes("difficult")) diffWeight = 3;

      // 4. Accuracy calculations
      const isMastered = mistake ? mistake.mastered : false;
      const totalRetries = mistake?.retryCount || 0;
      const accuracyRatio = totalRetries > 0 ? solvedCount / totalRetries : (isMastered ? 1 : 0);

      // 5. Priority Score Formula
      // Higher score means higher revision urgency
      let score = 0;
      let reasons: string[] = [];

      if (mistake && !isMastered) {
        score += occurrences * 15;
        reasons.push(`${occurrences} mistake occurrences`);
      }
      
      score += daysSinceLastAttempt * 1.5;
      if (daysSinceLastAttempt > 7) {
        reasons.push(`unrevised for ${daysSinceLastAttempt} days`);
      }

      score += diffWeight * 5;
      
      if (bookmark) {
        score += 10;
        reasons.push("bookmarked by user");
        if (bookmark.priority === "High") {
          score += 15;
          reasons.push("flagged high priority");
        }
      }

      // Subtract score for higher accuracy / mastery
      score -= accuracyRatio * 20;
      if (isMastered) {
        score -= 40;
      }

      // Estimate revision time based on question weight
      let estTime = 2; // MCQ default
      if (question.question_type === "NAT") estTime = 3;
      if (question.question_type === "MSQ") estTime = 4;
      if (diffWeight === 3) estTime += 1; // add extra minute for hard questions

      // Calculate confidence ratings (0-100)
      let confidence = 50; // default mid
      if (mistake) {
        confidence = mistake.confidence || (isMastered ? 85 : 30);
      } else if (bookmark) {
        confidence = bookmark.priority === "High" ? 40 : 70;
      }

      // Determine priority bucket
      let priority: AdaptiveRevisionItem['priority'] = 'Medium';
      if (score >= 45) {
        priority = 'Very High Priority';
      } else if (score >= 25) {
        priority = 'High';
      } else if (score >= 10) {
        priority = 'Medium';
      } else if (score >= 0) {
        priority = 'Low';
      } else {
        priority = 'Completed';
      }

      // Compile final reason statement
      let finalReason = reasons.length > 0 ? reasons.join(" & ") : "Scheduled review cycle";
      finalReason = finalReason.charAt(0).toUpperCase() + finalReason.slice(1);

      // Compute next suggested revision date
      const nextSuggested = new Date();
      if (priority === 'Very High Priority') {
        nextSuggested.setDate(now.getDate() + 1); // tomorrow
      } else if (priority === 'High') {
        nextSuggested.setDate(now.getDate() + 3); // 3 days
      } else if (priority === 'Medium') {
        nextSuggested.setDate(now.getDate() + 7); // 7 days
      } else {
        nextSuggested.setDate(now.getDate() + 14); // 14 days
      }

      queue.push({
        id: qid,
        question,
        type: mistake ? 'Mistake' : 'Bookmark',
        priority,
        priorityScore: score,
        reason: finalReason,
        estimatedTimeMin: estTime,
        confidencePercent: Math.round(confidence),
        revisionCount,
        lastRevised: lastRevisedStr,
        nextSuggestedRevision: toLocalDateStr(nextSuggested),
        sourceGoalTag: mistake?.sourceGoalTag || bookmark?.sourceGoalTag
      });
    });

    // Reorder queue dynamically: highest priority score first
    return queue.sort((a, b) => b.priorityScore - a.priorityScore);
  }
}
