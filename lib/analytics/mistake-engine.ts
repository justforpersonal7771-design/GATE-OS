import { ExamSession } from "@/types/exam-runtime.types";
import { IDBManager } from "@/lib/repository/storage/idb-manager";
import { QuestionRepository } from "@/lib/repository/question-repository";

export class MistakeEngine {
  public static async processSession(session: ExamSession): Promise<void> {
    const responses = Object.values(session.responses || {});
    const now = new Date().toISOString();

    for (const response of responses) {
      const question = QuestionRepository.getQuestionById(response.questionId);
      if (!question) continue;

      let isMistake = false;

      const isUnanswered = ["NOT_VISITED", "VISITED", "MARKED"].includes(response.status);
      const isAnswered = ["ANSWERED", "MARKED_AND_ANSWERED"].includes(response.status);

      if (isUnanswered) {
        isMistake = true;
      } else if (isAnswered) {
        let isCorrect = false;
        if (question.question_type === "MCQ" || question.question_type === "MSQ") {
          const correctOptions = (question.options || []).filter(o => o.is_correct).map(o => o.option_id).sort().join(",");
          const userOptions = (response.selectedOptions || []).sort().join(",");
          isCorrect = correctOptions === userOptions;
        } else if (question.question_type === "NAT") {
          if (question.nat_answer_range && response.natValue) {
            const val = parseFloat(response.natValue);
            isCorrect = !isNaN(val) && val >= question.nat_answer_range.min && val <= question.nat_answer_range.max;
          }
        }
        
        if (!isCorrect) {
          isMistake = true;
        }
      }

      if (isMistake) {
        // Fetch existing mistake to not overwrite review count
        const mistakes = await IDBManager.getAllMistakes();
        const existing = mistakes.find(m => m.questionId === response.questionId);
        
        if (existing) {
          existing.lastReviewed = now;
          existing.mastered = false; // reset mastered
          existing.selectedOptions = response.selectedOptions;
          existing.natValue = response.natValue;
          await IDBManager.saveMistake(existing);
        } else {
          await IDBManager.saveMistake({
            questionId: response.questionId,
            firstSeen: now,
            lastReviewed: null,
            reviewCount: 0,
            mastered: false,
            subject: question.subject || "General",
            topic: question.topic || "General",
            difficulty: question.difficulty || "Moderate",
            selectedOptions: response.selectedOptions,
            natValue: response.natValue
          });
        }
      }
    }
  }

  public static async markMastered(questionId: string): Promise<void> {
    const mistakes = await IDBManager.getAllMistakes();
    const existing = mistakes.find(m => m.questionId === questionId);
    if (existing) {
      existing.mastered = true;
      await IDBManager.saveMistake(existing);
    }
  }

  public static async recordReview(questionId: string): Promise<void> {
    const mistakes = await IDBManager.getAllMistakes();
    const existing = mistakes.find(m => m.questionId === questionId);
    if (existing) {
      existing.reviewCount++;
      existing.lastReviewed = new Date().toISOString();
      await IDBManager.saveMistake(existing);
    }
  }
}
