import { RenderableQuestion } from "@/types/question.types";
import { MistakeEntry, BookmarkEntry } from "@/types/study.types";
import { ExamSession } from "@/types/exam-runtime.types";
import { SubjectAnalytics, TopicAnalytics } from "@/types/analytics.types";

export interface TopicMastery {
  topic: string;
  subject: string;
  score: number; // 0 to 100
  correctCount: number;
  totalAttempts: number;
}

export class MasteryEngine {
  public static calculateTopicMastery(
    allQuestions: RenderableQuestion[],
    sessions: ExamSession[],
    mistakes: MistakeEntry[]
  ): Record<string, TopicMastery> {
    const topicStats: Record<string, { subject: string; correct: number; total: number }> = {};

    // Initialize all topics
    allQuestions.forEach(q => {
      if (q.topic) {
        if (!topicStats[q.topic]) {
          topicStats[q.topic] = { subject: q.subject || "General", correct: 0, total: 0 };
        }
      }
    });

    // Aggregate attempts from submitted sessions
    sessions.forEach(session => {
      if (session.status !== "SUBMITTED") return;
      const responses = Object.values(session.responses || {});
      responses.forEach(res => {
        const question = allQuestions.find(q => q.question_id === res.questionId);
        if (!question || !question.topic) return;

        const isAttempted = ["ANSWERED", "MARKED_AND_ANSWERED"].includes(res.status);
        if (!isAttempted) return;

        topicStats[question.topic].total++;

        // Basic evaluation check
        let isCorrect = false;
        if (question.question_type === "MCQ" || question.question_type === "MSQ") {
          const correctOpts = (question.options || []).filter(o => o.is_correct).map(o => o.option_id).sort().join(",");
          const userOpts = (res.selectedOptions || []).sort().join(",");
          isCorrect = correctOpts === userOpts;
        } else if (question.question_type === "NAT" && question.nat_answer_range && res.natValue) {
          const val = parseFloat(res.natValue);
          isCorrect = !isNaN(val) && val >= question.nat_answer_range.min && val <= question.nat_answer_range.max;
        }

        if (isCorrect) {
          topicStats[question.topic].correct++;
        }
      });
    });

    // Penalize score if mistakes are open in mistakes bank
    const topicMastery: Record<string, TopicMastery> = {};
    Object.entries(topicStats).forEach(([topic, stats]) => {
      let accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
      
      // Calculate pending mistakes in this topic
      const pendingMistakes = mistakes.filter(m => m.topic === topic && !m.mastered).length;
      
      // Penalty: subtract 5% per open mistake, min score 0, max 100
      let score = Math.max(0, Math.min(100, stats.total > 0 ? (accuracy - pendingMistakes * 5) : 0));
      
      // If no attempts, but questions exist, default score is 0
      if (stats.total === 0) {
        score = 0;
      }

      topicMastery[topic] = {
        topic,
        subject: stats.subject,
        score: Math.round(score),
        correctCount: stats.correct,
        totalAttempts: stats.total
      };
    });

    return topicMastery;
  }

  public static calculateOverallMastery(topicMastery: Record<string, TopicMastery>): number {
    const topics = Object.values(topicMastery).filter(t => t.totalAttempts > 0);
    if (topics.length === 0) return 0;
    const sum = topics.reduce((acc, t) => acc + t.score, 0);
    return Math.round(sum / topics.length);
  }

  public static calculateReadinessScore(
    overallMastery: number,
    allQuestions: RenderableQuestion[],
    sessions: ExamSession[]
  ): number {
    // 1. Topic coverage
    const attemptedIds = new Set<string>();
    sessions.forEach(s => {
      if (s.status !== "SUBMITTED") return;
      Object.values(s.responses || {}).forEach(r => {
        if (["ANSWERED", "MARKED_AND_ANSWERED"].includes(r.status)) {
          attemptedIds.add(r.questionId);
        }
      });
    });

    const totalQuestions = allQuestions.length || 1;
    const coverageRatio = attemptedIds.size / totalQuestions;
    const coverageScore = Math.min(100, coverageRatio * 100);

    // 2. Readiness is a mix of coverage and mastery
    const readiness = (coverageScore * 0.4) + (overallMastery * 0.6);
    return Math.round(Math.max(0, Math.min(100, readiness)));
  }

  public static calculateConfidenceScore(
    overallAccuracy: number,
    sessions: ExamSession[]
  ): number {
    // Calculate speed bonus
    let totalQuestions = 0;
    let fastAnswers = 0;

    sessions.forEach(s => {
      if (s.status !== "SUBMITTED") return;
      Object.values(s.responses || {}).forEach(r => {
        if (["ANSWERED", "MARKED_AND_ANSWERED"].includes(r.status)) {
          totalQuestions++;
          // A question solved in less than 90s is considered fast (standard recommendation is 108s per mark)
          if ((r.timeSpentSeconds || 0) < 90) {
            fastAnswers++;
          }
        }
      });
    });

    const speedRatio = totalQuestions > 0 ? (fastAnswers / totalQuestions) * 100 : 50;
    
    // Confidence is accuracy mixed with speed
    const confidence = (overallAccuracy * 0.7) + (speedRatio * 0.3);
    return Math.round(Math.max(0, Math.min(100, confidence)));
  }
}
