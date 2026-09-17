import { ContextBuilder } from "./ai-context-builder";
import { PromptBuilder } from "./ai-prompts";
import { AIClient } from "./ai-client";
import { ContextCompressor } from "./token-estimator";
import { 
  AIResponse, AIExplanation, AIHint, AIRecommendation, 
  AIRevisionPlan, AIPracticeQuestion 
} from "@/types/ai.types";

export class AIService {
  /**
   * Cancel an active request by ID.
   */
  public static cancelRequest(requestId: string) {
    try {
      const { RateLimiter } = require("./rate-limiter");
      RateLimiter.cancelRequest(requestId);
    } catch {}
  }

  /**
   * Explains the core solution and concept of a given question.
   */
  public static async explainQuestion(
    questionId: string,
    currentResponse?: {
      selectedOptions: string[];
      natValue?: string;
      isCorrect: boolean;
      timeSpentSeconds: number;
    },
    mode = "Detailed",
    personality = "Mentor",
    bypassCache = false
  ): Promise<AIResponse<AIExplanation>> {
    // 1. Build Raw Context
    const rawContext = await ContextBuilder.buildContext(questionId, currentResponse);
    
    // 2. Compress Context
    const compressedContext = ContextCompressor.compress(rawContext);

    // 3. Build Standardized Prompts
    const { systemInstruction, prompt } = PromptBuilder.buildExplainPrompt(compressedContext, mode, personality);

    // 4. Request Gemini execution
    return await AIClient.request<AIExplanation>(
      `explain_${questionId}_${mode || "default"}_${personality || "default"}`,
      systemInstruction,
      prompt,
      {
        questionId,
        topic: rawContext.currentQuestion?.topic,
        bypassCache
      }
    );
  }

  /**
   * Generates progressive conceptual hints for a question.
   */
  public static async generateHint(
    questionId: string,
    bypassCache = false
  ): Promise<AIResponse<AIHint>> {
    const rawContext = await ContextBuilder.buildContext(questionId);
    const compressedContext = ContextCompressor.compress(rawContext);
    const { systemInstruction, prompt } = PromptBuilder.buildHintPrompt(compressedContext);

    return await AIClient.request<AIHint>(
      `hint_${questionId}`,
      systemInstruction,
      prompt,
      {
        questionId,
        topic: rawContext.currentQuestion?.topic,
        bypassCache
      }
    );
  }

  /**
   * Generates custom short-cuts, time-saving tricks, or verification rules.
   */
  public static async generateShortcut(
    questionId: string,
    bypassCache = false
  ): Promise<AIResponse<AIExplanation>> {
    const rawContext = await ContextBuilder.buildContext(questionId);
    const compressedContext = ContextCompressor.compress(rawContext);
    const { systemInstruction, prompt } = PromptBuilder.buildShortcutPrompt(compressedContext);

    return await AIClient.request<AIExplanation>(
      `shortcut_${questionId}`,
      systemInstruction,
      prompt,
      {
        questionId,
        topic: rawContext.currentQuestion?.topic,
        bypassCache
      }
    );
  }

  /**
   * Generates custom practice questions dynamically.
   */
  public static async generatePracticeQuestions(
    topic: string,
    count = 2,
    bypassCache = false,
    currentQuestion?: any
  ): Promise<AIResponse<{ questions: AIPracticeQuestion[] }>> {
    const rawContext = await ContextBuilder.buildContext(undefined);
    if (currentQuestion) {
      rawContext.currentQuestion = currentQuestion;
    }
    const compressedContext = ContextCompressor.compress(rawContext);

    // Fetch reference samples from QuestionRepository
    let samples: any[] = [];
    try {
      const { QuestionRepository } = await import("@/lib/repository/question-repository");
      samples = QuestionRepository.getQuestionsByTopic(topic).slice(0, 2);
    } catch (e) {
      console.warn("Failed to retrieve sample questions for practice prompt builder context", e);
    }

    const { systemInstruction, prompt } = PromptBuilder.buildPracticePrompt(compressedContext, count, samples, currentQuestion);

    return await AIClient.request<{ questions: AIPracticeQuestion[] }>(
      `practice_${topic}_${count}`,
      systemInstruction,
      prompt,
      {
        topic,
        bypassCache
      }
    );
  }

  /**
   * Recommends high-priority revision topics and schedule tips.
   */
  public static async recommendRevision(
    subject: string,
    bypassCache = false
  ): Promise<AIResponse<AIRevisionPlan>> {
    const rawContext = await ContextBuilder.buildContext(undefined);
    const compressedContext = ContextCompressor.compress(rawContext);
    const { systemInstruction, prompt } = PromptBuilder.buildRevisionPrompt(compressedContext, subject);

    return await AIClient.request<AIRevisionPlan>(
      `revision_${subject}`,
      systemInstruction,
      prompt,
      {
        bypassCache
      }
    );
  }

  /**
   * Performs an automated root-cause analysis on a student's mistakes history entries.
   */
  public static async analyzeMistake(
    questionId: string,
    bypassCache = false
  ): Promise<AIResponse<AIExplanation>> {
    // Reuses the explain endpoint but instructs context builders to attach mistake records.
    return await this.explainQuestion(questionId, undefined, undefined, undefined, bypassCache);
  }

  /**
   * Generates conversational follow-up response with session history context.
   */
  public static async chatFollowUp(
    questionId: string,
    history: { role: "user" | "model"; text: string }[],
    nextMessage: string,
    bypassCache = false
  ): Promise<AIResponse<AIExplanation>> {
    const rawContext = await ContextBuilder.buildContext(questionId);
    const compressedContext = ContextCompressor.compress(rawContext);
    const { systemInstruction, prompt } = PromptBuilder.buildFollowUpPrompt(compressedContext, history, nextMessage);

    return await AIClient.request<AIExplanation>(
      `chat_${questionId}_${Date.now()}`, // Chat handles dynamic IDs
      systemInstruction,
      prompt,
      {
        questionId,
        topic: rawContext.currentQuestion?.topic,
        bypassCache: true // Bypass cache for active dynamic chat conversations
      }
    );
  }
}
