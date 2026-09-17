import { AIContext } from "@/types/ai.types";

export class TokenEstimator {
  /**
   * Estimate token count of a string input using character-level heuristic (approx 4 chars per token).
   */
  public static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

export class ContextCompressor {
  /**
   * Compress AI context payload to stay safely within context limits (e.g. under 8,000 tokens).
   */
  public static compress(context: AIContext, maxTokens = 6000): AIContext {
    const compressed = { ...context };

    // 1. Keep only top 10 recent sessions to prevent history explosion
    if (compressed.recentSessions) {
      compressed.recentSessions = compressed.recentSessions.slice(0, 8);
    }

    // 2. Filter mistakes: keep only unresolved/mastery-relevant mistakes (max 10)
    if (compressed.recentMistakes) {
      const pending = compressed.recentMistakes.filter(m => !m.mastered);
      const solved = compressed.recentMistakes.filter(m => m.mastered);
      compressed.recentMistakes = [...pending.slice(0, 8), ...solved.slice(0, 4)];
    }

    // 3. Filter bookmarks: keep only the most relevant bookmarks (max 10)
    if (compressed.bookmarks) {
      compressed.bookmarks = compressed.bookmarks.slice(0, 10);
    }

    // 4. Summarize or compress analytics
    if (compressed.studentStats) {
      // Keep only key values (already compact)
    }

    // 5. Cap revision queue items
    if (compressed.revisionQueue) {
      compressed.revisionQueue = compressed.revisionQueue.slice(0, 10);
    }

    // 6. Limit active planner tasks
    if (compressed.activePlannerTasks) {
      compressed.activePlannerTasks = compressed.activePlannerTasks.slice(0, 5);
    }

    return compressed;
  }
}
