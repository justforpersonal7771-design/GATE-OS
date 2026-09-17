import { IDBManager } from "@/lib/repository/storage/idb-manager";

export interface ConversationHistoryMessage {
  role: "user" | "model";
  text: string;
  timestamp: string;
  data?: any; // Stores conceptual overview cards if model
  mode?: string;
  personality?: string;
}

export class ConversationMemory {
  /**
   * Save a question session conversation history into IndexedDB memory.
   */
  public static async saveConversation(
    questionId: string,
    history: Omit<ConversationHistoryMessage, "timestamp">[]
  ): Promise<void> {
    try {
      const formattedHistory: ConversationHistoryMessage[] = history.map(h => ({
        ...h,
        timestamp: (h as any).timestamp || new Date().toISOString()
      }));
      await IDBManager.saveAIMemory(`chat_history_${questionId}`, formattedHistory);
    } catch (e) {
      console.error(`Failed to save conversation for question ${questionId}`, e);
    }
  }

  /**
   * Get a question session conversation history from IndexedDB.
   */
  public static async getConversation(questionId: string): Promise<ConversationHistoryMessage[]> {
    try {
      const history = await IDBManager.getAIMemory(`chat_history_${questionId}`);
      return Array.isArray(history) ? history : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear conversation history.
   */
  public static async clearConversation(questionId: string): Promise<void> {
    try {
      await IDBManager.deleteAIMemory(`chat_history_${questionId}`);
    } catch {
      // Ignored
    }
  }
}
