import { AIContext } from "@/types/ai.types";
import { QuestionRepository } from "@/lib/repository/question-repository";
import { IDBManager } from "@/lib/repository/storage/idb-manager";
import { LearningEngine } from "@/lib/learning/LearningEngine";
import { useStudyStore } from "@/store/use-study-store";
import { ExamSession } from "@/types/exam-runtime.types";
import { RenderableQuestion } from "@/types/question.types";

export class ContextBuilder {
  /**
   * Automatically gathers the context payload for a given question and active study session state.
   */
  public static async buildContext(
    questionId?: string,
    currentResponse?: {
      selectedOptions: string[];
      natValue?: string;
      isCorrect: boolean;
      timeSpentSeconds: number;
    }
  ): Promise<AIContext> {
    // Ensure repos are initialized
    await QuestionRepository.initialize();

    // 1. Fetch Question details if provided
    let currentQuestion: RenderableQuestion | undefined = undefined;
    if (questionId) {
      const q = QuestionRepository.getQuestionById(questionId);
      if (q) {
        currentQuestion = q;
      }
    }

    // 2. Fetch personalized analysis from Learning Engine
    const intel = await LearningEngine.getPersonalizedIntelligence();

    // 3. Fetch Bookmarks and Mistakes
    const mistakes = await IDBManager.getAllMistakes();
    const bookmarks = await IDBManager.getAllBookmarks();

    // 4. Fetch Calendar Planner Events
    const activePlannerTasks = await IDBManager.getCalendarEvents();

    // 5. Fetch recent sessions
    const rawSessions = await IDBManager.getAllExamSessions();
    const recentSessions = rawSessions
      .map(s => s.sessionData as ExamSession)
      .filter(Boolean)
      .slice(0, 10);

    // 6. Map weak & strong topics
    const weakTopics: string[] = [];
    const strongTopics: string[] = [];
    if (intel.weakestSubject) {
      weakTopics.push(`${intel.weakestSubject} - Weakest Area`);
    }
    if (intel.mostDecliningTopic) {
      weakTopics.push(intel.mostDecliningTopic);
    }
    if (intel.strongestSubject) {
      strongTopics.push(`${intel.strongestSubject} - Strongest Area`);
    }
    if (intel.mostImprovingTopic) {
      strongTopics.push(intel.mostImprovingTopic);
    }

    // 7. Map revision queue names
    const revisionQueue = intel.revisionQueue.map(item => item.question.topic);

    return {
      currentQuestion,
      currentResponse,
      studentStats: {
        masteryScore: intel.masteryScore,
        readinessScore: intel.readinessScore,
        confidenceScore: intel.confidenceScore,
        studyMomentum: intel.studyMomentum,
        consistencyScore: intel.consistencyScore,
        weakestSubject: intel.weakestSubject,
        strongestSubject: intel.strongestSubject,
        mostImprovingTopic: intel.mostImprovingTopic,
        mostDecliningTopic: intel.mostDecliningTopic,
      },
      weakTopics,
      strongTopics,
      recentMistakes: mistakes,
      bookmarks,
      activePlannerTasks,
      recentSessions,
      revisionQueue,
    };
  }
}
