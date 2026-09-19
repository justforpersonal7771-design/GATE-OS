import { AIService } from "./AIService";
import { AIPracticeQuestion } from "@/types/ai.types";

export class PracticeGenerator {
  /**
   * Generates a set of diverse custom practice questions:
   * Easy, Medium, Hard, NAT, MSQ, Interview, Conceptual, and a Trick question.
   */
  public static async generateDiversePracticeSet(
    topic: string,
    subject: string,
    bypassCache = false,
    currentQuestion?: any
  ): Promise<AIPracticeQuestion[]> {
    const response = await AIService.generatePracticeQuestions(topic, subject, 8, bypassCache, currentQuestion);

    if (response.success && response.data && response.data.questions) {
      // Map and tag each question with standard parameters
      const types = [
        "Easy Question", "Medium Question", "Hard Question",
        "NAT", "MSQ", "Interview Question", "Conceptual Question", "Trick Question"
      ];

      return response.data.questions.map((q, idx) => ({
        ...q,
        difficulty: idx < 3 ? (idx === 0 ? "Easy" : idx === 1 ? "Medium" : "Hard") : q.difficulty,
        topic: topic,
        subject: subject,
        questionType: idx === 3 ? "NAT" : idx === 4 ? "MSQ" : "MCQ",
        estimatedSolvingTimeMin: idx < 3 ? (idx + 1) * 2 : 5,
        tag: types[idx] || "Practice Question"
      })) as any[];
    }

    return [];
  }
}
