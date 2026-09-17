import { IDBManager } from "@/lib/repository/storage/idb-manager";

export interface MistakePattern {
  id: string;
  name: string;
  patternType: "Panic" | "OptionBias" | "NatConfusion" | "TopicConfusion";
  description: string;
  probability: number; // 0 to 100
  confidence: number;  // 0 to 100
  suggestedFix: string;
}

export class InsightMemory {
  private static patterns: MistakePattern[] = [];
  private static isLoaded = false;

  public static async load(): Promise<void> {
    if (this.isLoaded) return;
    try {
      const data = await IDBManager.getAIMemory("insight_memory");
      if (data && Array.isArray(data)) {
        this.patterns = data;
      }
    } catch {
      // Ignored
    }
    this.isLoaded = true;
  }

  public static async save(): Promise<void> {
    try {
      await IDBManager.saveAIMemory("insight_memory", this.patterns);
    } catch {
      // Ignored
    }
  }

  /**
   * Run mistake pattern discovery scan over mistakes lists and learning logs.
   */
  public static async scanMistakePatterns(
    mistakes: any[],
    questionsRepository: any
  ): Promise<MistakePattern[]> {
    await this.load();
    const discovered: MistakePattern[] = [];

    if (mistakes.length === 0) return [];

    // Pattern 1: Panic Threshold (High Time Spent on Mistakes)
    const longAttempts = mistakes.filter(m => m.timeSpentSeconds && m.timeSpentSeconds > 150);
    if (longAttempts.length >= 2) {
      discovered.push({
        id: "pat_panic_high_time",
        name: "Time-Pressure Panic Mode",
        patternType: "Panic",
        description: `You frequently spend more than 2.5 minutes on tough questions before getting them incorrect.`,
        probability: Math.min(100, Math.round((longAttempts.length / mistakes.length) * 100)),
        confidence: 85,
        suggestedFix: "Implement a 2-minute hard rule: if a solution doesn't crystallize within 120s, flag the question and skip immediately to keep momentum."
      });
    }

    // Pattern 2: Option Selection Bias (Selecting Option C under uncertainty)
    const selectedOptions = mistakes.flatMap(m => m.selectedOptions || []);
    const cSelections = selectedOptions.filter(o => o === "C").length;
    if (selectedOptions.length >= 5 && cSelections / selectedOptions.length > 0.4) {
      discovered.push({
        id: "pat_option_c_bias",
        name: "Option C Selection Bias",
        patternType: "OptionBias",
        description: "You exhibit an statistical bias towards selecting Option C when uncertain on multiple-choice items.",
        probability: Math.round((cSelections / selectedOptions.length) * 100),
        confidence: 90,
        suggestedFix: "Double-check your reasoning whenever selecting 'C'. Actively eliminate Option A and B first before locking in choices."
      });
    }

    // Pattern 3: NAT Answer Typing Confusion
    const natMistakes = mistakes.filter(m => {
      const q = questionsRepository.getQuestionById(m.questionId);
      return q && q.question_type === "NAT";
    });
    if (natMistakes.length >= 3) {
      discovered.push({
        id: "pat_nat_typing",
        name: "NAT Decimal/Sign Range Faults",
        patternType: "NatConfusion",
        description: "Decimal rounding and sign conventions lead to high mistakes count in Numerical Answer Type (NAT) problems.",
        probability: Math.min(100, Math.round((natMistakes.length / mistakes.length) * 100)),
        confidence: 80,
        suggestedFix: "Verify units and rounding guidelines carefully (e.g. round to 2 decimal places). Keep scratch computations precise to 4 decimals."
      });
    }

    // Pattern 4: Topic-Specific Traversal/State Confusion
    const topicCounts: Record<string, number> = {};
    mistakes.forEach(m => {
      const q = questionsRepository.getQuestionById(m.questionId);
      if (q && q.topic) {
        topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
      }
    });

    const worstTopicEntry = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0];
    if (worstTopicEntry && worstTopicEntry[1] >= 3) {
      discovered.push({
        id: "pat_topic_confusion",
        name: `Structural Traps in ${worstTopicEntry[0]}`,
        patternType: "TopicConfusion",
        description: `Your highest mistake frequency is clustered in "${worstTopicEntry[0]}" (recorded ${worstTopicEntry[1]} distinct errors).`,
        probability: Math.min(100, Math.round((worstTopicEntry[1] / mistakes.length) * 100)),
        confidence: 95,
        suggestedFix: `Revisit the prerequisite concepts of ${worstTopicEntry[0]} using the Prerequisite Knowledge Graph to verify foundation basics.`
      });
    }

    this.patterns = discovered;
    await this.save();
    return discovered;
  }
}
