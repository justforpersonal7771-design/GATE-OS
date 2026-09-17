import { IDBManager } from "@/lib/repository/storage/idb-manager";

export interface LearningInteraction {
  questionId: string;
  topic: string;
  subject: string;
  difficulty: string;
  timestamp: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  confidenceBefore: number;
  confidenceAfter: number;
  notesSaved?: string;
  practiceGenerated?: boolean;
}

export class LearningMemory {
  private static interactions: LearningInteraction[] = [];
  private static isLoaded = false;

  /**
   * Load history from IndexedDB.
   */
  public static async load(): Promise<void> {
    if (this.isLoaded) return;
    try {
      const data = await IDBManager.getAIMemory("learning_memory");
      if (data && Array.isArray(data)) {
        this.interactions = data;
      }
    } catch (e) {
      console.error("Failed to load LearningMemory", e);
    }
    this.isLoaded = true;
  }

  /**
   * Save learning history to IndexedDB.
   */
  public static async save(): Promise<void> {
    try {
      await IDBManager.saveAIMemory("learning_memory", this.interactions);
    } catch (e) {
      console.error("Failed to save LearningMemory", e);
    }
  }

  /**
   * Record a new study/exam attempt interaction.
   */
  public static async recordInteraction(interaction: Omit<LearningInteraction, "timestamp">): Promise<void> {
    await this.load();
    const newItem: LearningInteraction = {
      ...interaction,
      timestamp: new Date().toISOString()
    };
    this.interactions.push(newItem);
    await this.save();
  }

  /**
   * Return all interactions in learning memory.
   */
  public static async getAllInteractions(): Promise<LearningInteraction[]> {
    await this.load();
    return this.interactions;
  }

  /**
   * Return interactions by topic.
   */
  public static async getInteractionsByTopic(topic: string): Promise<LearningInteraction[]> {
    await this.load();
    return this.interactions.filter(i => i.topic === topic);
  }

  /**
   * Return interactions by questionId.
   */
  public static async getInteractionsByQuestion(questionId: string): Promise<LearningInteraction[]> {
    await this.load();
    return this.interactions.filter(i => i.questionId === questionId);
  }
}
