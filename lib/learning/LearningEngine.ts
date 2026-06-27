import { QuestionRepository } from "@/lib/repository/question-repository";
import { IDBManager } from "@/lib/repository/storage/idb-manager";
import { MasteryEngine, TopicMastery } from "./MasteryEngine";
import { FocusEngine } from "./FocusEngine";
import { RecommendationEngine } from "./RecommendationEngine";
import { AdaptiveEngine, AdaptiveRevisionItem } from "./AdaptiveEngine";
import { StreakEngine } from "@/lib/analytics/streak-engine";
import { ExamSession } from "@/types/exam-runtime.types";

export interface PersonalizedIntelligence {
  masteryScore: number;
  readinessScore: number;
  confidenceScore: number;
  studyMomentum: number; // calculated streak/intensity
  consistencyScore: number; // percentage days active
  weakestSubject: string;
  strongestSubject: string;
  mostImprovingTopic: string;
  mostDecliningTopic: string;
  insights: string[];
  todaysFocus: {
    topic: string;
    reason: string;
  };
  todaysTarget: {
    title: string;
    count: number;
    reason: string;
  };
  revisionQueue: AdaptiveRevisionItem[];
}

export class LearningEngine {
  public static async getPersonalizedIntelligence(): Promise<PersonalizedIntelligence> {
    await QuestionRepository.initialize();

    const allQuestions = QuestionRepository.getAllQuestions();
    const rawSessions = await IDBManager.getAllExamSessions();
    const sessions = rawSessions.map(s => s.sessionData as ExamSession).filter(Boolean);
    const mistakes = await IDBManager.getAllMistakes();
    const bookmarks = await IDBManager.getAllBookmarks();
    const calendarEvents = await IDBManager.getCalendarEvents();

    // 1. Mastery Score calculations
    const topicMastery = MasteryEngine.calculateTopicMastery(allQuestions, sessions, mistakes);
    const masteryScore = MasteryEngine.calculateOverallMastery(topicMastery);
    const readinessScore = MasteryEngine.calculateReadinessScore(masteryScore, allQuestions, sessions);

    // Get practice accuracy
    let totalAttempted = 0;
    let totalCorrect = 0;
    sessions.forEach(s => {
      if (s.status !== "SUBMITTED") return;
      Object.values(s.responses || {}).forEach(r => {
        if (["ANSWERED", "MARKED_AND_ANSWERED"].includes(r.status)) {
          totalAttempted++;
          const q = allQuestions.find(quest => quest.question_id === r.questionId);
          if (!q) return;

          let isCorrect = false;
          if (q.question_type === "MCQ" || q.question_type === "MSQ") {
            const correctOpts = (q.options || []).filter(o => o.is_correct).map(o => o.option_id).sort().join(",");
            const userOpts = (r.selectedOptions || []).sort().join(",");
            isCorrect = correctOpts === userOpts;
          } else if (q.question_type === "NAT" && q.nat_answer_range && r.natValue) {
            const val = parseFloat(r.natValue);
            isCorrect = !isNaN(val) && val >= q.nat_answer_range.min && val <= q.nat_answer_range.max;
          }

          if (isCorrect) totalCorrect++;
        }
      });
    });

    const overallAccuracy = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;
    const confidenceScore = MasteryEngine.calculateConfidenceScore(overallAccuracy, sessions);

    // 2. Focus Engine calculations
    const focusData = FocusEngine.analyzeFocus(allQuestions, sessions, mistakes, bookmarks, topicMastery);

    // 3. Consistency and momentum
    const { currentStreak } = StreakEngine.calculateStreak(sessions);
    const studyMomentum = currentStreak;

    // Consistency score (active days count / 30)
    const activeDates = new Set(sessions.map(s => s.startedAt?.split("T")[0]).filter(Boolean));
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeInLast30 = Array.from(activeDates).filter(dStr => new Date(dStr!) >= thirtyDaysAgo).length;
    const consistencyScore = Math.round((activeInLast30 / 30) * 100);

    // 4. Recommendation Engine calculations
    const recommendations = RecommendationEngine.generateRecommendations(
      allQuestions,
      mistakes,
      bookmarks,
      topicMastery,
      calendarEvents,
      focusData.weakestSubject
    );

    // 5. Adaptive Revision queue
    const revisionQueue = AdaptiveEngine.generateRevisionQueue(allQuestions, mistakes, bookmarks);

    // 6. Dynamic Smart Insights Generation (Part 3)
    const insights: string[] = [];

    // Overall metrics feedback
    if (overallAccuracy > 70) {
      insights.push(`Your overall accuracy stands at a premium ${Math.round(overallAccuracy)}%. Keep it up!`);
    } else if (overallAccuracy > 0) {
      insights.push(`Accuracy is currently ${Math.round(overallAccuracy)}%. Work through mistakes to push past 70%.`);
    }

    if (consistencyScore > 50) {
      insights.push(`Your revision consistency has improved by ${consistencyScore}% in the last 30 days.`);
    } else {
      insights.push(`Aim to practice at least 4 times a week to improve learning momentum.`);
    }

    // Weakest/Strongest subject insights
    if (focusData.strongestSubject) {
      insights.push(`${focusData.strongestSubject} has become your strongest section.`);
    }
    if (focusData.weakestSubject) {
      insights.push(`You repeatedly lose marks in ${focusData.weakestSubject}. Direct focus here.`);
    }

    // Speed insights
    let avgSpeedSec = 0;
    if (totalAttempted > 0) {
      let totalSpeed = 0;
      sessions.forEach(s => {
        if (s.status !== "SUBMITTED") return;
        Object.values(s.responses || {}).forEach(r => {
          if (["ANSWERED", "MARKED_AND_ANSWERED"].includes(r.status)) {
            totalSpeed += r.timeSpentSeconds || 0;
          }
        });
      });
      avgSpeedSec = Math.round(totalSpeed / totalAttempted);
    }
    if (avgSpeedSec > 0) {
      insights.push(`You average ${avgSpeedSec}s per question attempt. Standard recommendation is 108s.`);
    }

    // Declining topic insights
    if (focusData.mostDecliningTopic && focusData.mostDecliningTopic !== "None yet") {
      insights.push(`Performance is declining in ${focusData.mostDecliningTopic}. Allocate additional study hours.`);
    }
    if (focusData.mostImprovingTopic && focusData.mostImprovingTopic !== "None yet") {
      insights.push(`You improved ${focusData.mostImprovingTopic} significantly this month.`);
    }

    // Default catch-all insights if none generated
    if (insights.length < 3) {
      insights.push("Start mock exams to generate personalized performance insights.");
      insights.push("Unresolved mistakes in Mistakes Bank will drag down topic readiness scores.");
      insights.push("Save formulas and important question sets to Bookmarks for revision cycles.");
    }

    return {
      masteryScore,
      readinessScore,
      confidenceScore,
      studyMomentum,
      consistencyScore,
      weakestSubject: focusData.weakestSubject,
      strongestSubject: focusData.strongestSubject,
      mostImprovingTopic: focusData.mostImprovingTopic,
      mostDecliningTopic: focusData.mostDecliningTopic,
      insights: insights.slice(0, 5), // return top 5 insights
      todaysFocus: recommendations.todaysFocus,
      todaysTarget: recommendations.todaysTarget,
      revisionQueue
    };
  }
}
