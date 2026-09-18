import { ExamSession } from "@/types/exam-runtime.types";
import { QuestionRepository } from "@/lib/repository/question-repository";
import { DashboardMetrics, SubjectAnalytics, TopicAnalytics, DifficultyAnalytics, StudyMetrics } from "@/types/analytics.types";
import { StreakEngine } from "./streak-engine";

export class AnalyticsEngine {
  public static async generateDashboardMetrics(sessions: ExamSession[]): Promise<DashboardMetrics> {
    await QuestionRepository.initialize();

    const { currentStreak, longestStreak, lastActiveDate } = StreakEngine.calculateStreak(sessions);

    let totalQuestionsAttempted = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalSkipped = 0;
    let totalTimeSpentMs = 0;
    
    // Aggregations
    const subjects: Record<string, SubjectAnalytics> = {};
    const topics: Record<string, TopicAnalytics> = {};
    const difficulties: Record<string, DifficultyAnalytics> = {};

    const completedSessions = sessions.filter(s => s.status === "SUBMITTED");
    const sessionSummaries: Record<string, { attempted: number; correct: number; totalScore: number; maxScore: number }> = {};

    completedSessions.forEach(session => {
      const sessionResponses = Object.values(session.responses || {});
      const sessionStat = { attempted: 0, correct: 0, totalScore: 0, maxScore: 0 };
      sessionSummaries[session.id] = sessionStat;

      sessionResponses.forEach(qContext => {
        const questionId = qContext.questionId;
        const question = QuestionRepository.getQuestion(questionId);
        if (!question) return;

        sessionStat.maxScore += question.marks;

        const subject = question.subject;
        const topic = question.topic;
        const difficulty = question.difficulty;
        
        // Initialize if not exists
        if (!subjects[subject]) {
          subjects[subject] = { subject, attempted: 0, correct: 0, incorrect: 0, skipped: 0, timeSpentMs: 0 };
        }
        if (!topics[topic]) {
          topics[topic] = { topic, subject, attempted: 0, correct: 0, incorrect: 0, skipped: 0, timeSpentMs: 0 };
        }
        if (!difficulties[difficulty]) {
          difficulties[difficulty] = { difficulty, attempted: 0, correct: 0, incorrect: 0, skipped: 0, timeSpentMs: 0 };
        }

        const isVisited = qContext.status !== "NOT_VISITED";
        const isAttempted = qContext.status === "ANSWERED" || qContext.status === "MARKED_AND_ANSWERED";
        
        if (isAttempted) {
          totalQuestionsAttempted++;
          subjects[subject].attempted++;
          topics[topic].attempted++;
          difficulties[difficulty].attempted++;
          sessionStat.attempted++;

          let isCorrect = false;
          if (question.question_type === "MCQ" || question.question_type === "MSQ") {
             const correctOptions = (question.options || []).filter(o => o.is_correct).map(o => o.option_id).sort().join(",");
             const userOptions = (qContext.selectedOptions || []).sort().join(",");
             isCorrect = correctOptions === userOptions;
           } else if (question.question_type === "NAT") {
             // simplified NAT check: match single value or range
             if (question.nat_answer_range && qContext.natValue) {
               const val = parseFloat(qContext.natValue);
               isCorrect = !isNaN(val) && val >= question.nat_answer_range.min && val <= question.nat_answer_range.max;
             }
           }

          if (isCorrect) {
            totalCorrect++;
            subjects[subject].correct++;
            topics[topic].correct++;
            difficulties[difficulty].correct++;
            sessionStat.correct++;
            sessionStat.totalScore += question.marks;
          } else {
            totalIncorrect++;
            subjects[subject].incorrect++;
            topics[topic].incorrect++;
            difficulties[difficulty].incorrect++;
            // GATE negative marking applies only to MCQ (see exam/results scoring).
            if (question.question_type === "MCQ") {
              sessionStat.totalScore -= question.marks / 3;
            }
          }
        } else if (isVisited) {
          totalSkipped++;
          subjects[subject].skipped++;
          topics[topic].skipped++;
          difficulties[difficulty].skipped++;
        }

        const timeSpent = (qContext.timeSpentSeconds || 0) * 1000;
        totalTimeSpentMs += timeSpent;
        subjects[subject].timeSpentMs += timeSpent;
        topics[topic].timeSpentMs += timeSpent;
        difficulties[difficulty].timeSpentMs += timeSpent;
      });
    });

    const overallAccuracy = totalQuestionsAttempted > 0 ? (totalCorrect / totalQuestionsAttempted) * 100 : 0;
    const avgTimePerQuestionMs = totalQuestionsAttempted > 0 ? totalTimeSpentMs / totalQuestionsAttempted : 0;

    const overview: StudyMetrics = {
      currentStreak,
      longestStreak,
      lastActiveDate,
      totalQuestionsSolved: totalQuestionsAttempted,
      overallAccuracy,
      totalTimeSpentMs,
      avgTimePerQuestionMs,
    };

    return {
      overview,
      subjectPerformance: Object.values(subjects),
      topicPerformance: Object.values(topics),
      difficultyPerformance: Object.values(difficulties),
      recentSessions: sessions.sort((a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime()).slice(0, 10).map(s => {
        const stat = sessionSummaries[s.id];
        return {
          id: s.id,
          config: { name: "Exam Session" },
          testConfig: s.draftConfig.config,
          updatedAt: s.startedAt,
          status: s.status,
          startedAt: s.startedAt,
          attempted: stat?.attempted || 0,
          correct: stat?.correct || 0,
          accuracy: stat && stat.attempted > 0 ? Math.round((stat.correct / stat.attempted) * 100) : 0,
          score: { totalScore: stat ? Math.round(stat.totalScore * 100) / 100 : 0, maxScore: stat?.maxScore || 0 },
        };
      })
    };
  }
}
