import { QuestionRepository } from "@/lib/repository/question-repository";
import { TestConfig, ExamSessionDraft, ExamQuestion } from "@/types/exam.types";
import { RenderableQuestion } from "@/types/question.types";
import { SeededRandom } from "./utils/seeded-random";

export class ExamBuilder {
  public static generateDraft(config: TestConfig): ExamSessionDraft {
    let questions: ExamQuestion[] = [];
    const seed = config.seed || Date.now();

    switch (config.examType) {
      case "YEAR_PAPER":
        if (!config.yearShift)
          throw new Error("yearShift is required for YEAR_PAPER");
        questions = this.buildYearPaper(config.yearShift, seed);
        break;
      case "SUBJECT_TEST":
        if (!config.subject)
          throw new Error("subject is required for SUBJECT_TEST");
        questions = this.buildSubjectTest(
          config.subject,
          config.questionCount || 20,
          seed,
        );
        break;
      case "TOPIC_TEST":
        if (!config.topics || config.topics.length === 0)
          throw new Error("topics are required for TOPIC_TEST");
        // For simplicity, Topic Test usually targets one primary topic, but we support an array.
        questions = this.buildTopicTest(
          config.topics[0],
          config.questionCount || 10,
          seed,
        );
        break;
      case "SECTION_TEST":
        if (!config.section)
          throw new Error("section is required for SECTION_TEST");
        questions = this.buildSectionTest(
          config.section,
          config.questionCount || 20,
          seed,
        );
        break;
      case "CUSTOM_TEST":
      case "GRAND_MOCK":
      default:
        questions = this.buildCustomTest(config, seed);
        break;
    }

    return {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString(),
      config,
      questions,
      createdAt: new Date().toISOString(),
    };
  }

  public static buildYearPaper(
    yearShift: string,
    seed?: number,
  ): ExamQuestion[] {
    const repo = QuestionRepository;
    const questions = repo.getPaper(yearShift);
    // Year papers are usually presented in sequence, but we can shuffle if a specific seed strategy is defined
    return this.takeRandom(questions, questions.length, seed, false);
  }

  public static buildSubjectTest(
    subject: string,
    count: number,
    seed?: number,
  ): ExamQuestion[] {
    const repo = QuestionRepository;
    const questions = repo.getSubjectBank(subject);
    return this.takeRandom(questions, count, seed, true);
  }

  public static buildSectionTest(
    section: string,
    count: number,
    seed?: number,
  ): ExamQuestion[] {
    const repo = QuestionRepository;
    const questions = repo.getQuestionsBySection(section);
    return this.takeRandom(questions, count, seed, true);
  }

  public static buildTopicTest(
    topic: string,
    count: number,
    seed?: number,
  ): ExamQuestion[] {
    const repo = QuestionRepository;
    const questions = repo.getQuestionsByTopic(topic);
    return this.takeRandom(questions, count, seed, true);
  }

  public static buildCustomTest(
    config: TestConfig,
    seed?: number,
  ): ExamQuestion[] {
    const repo = QuestionRepository;
    
    if (config.customBlocks && config.customBlocks.length > 0) {
      let finalQuestions: RenderableQuestion[] = [];
      const seenIds = new Set<string>();
      const rng = new SeededRandom(seed);

      for (const block of config.customBlocks) {
        let pool = repo.getAllQuestions();

        if (block.yearShift) {
           pool = pool.filter(q => q.year_shift === block.yearShift);
        }
        if (block.section) {
           pool = pool.filter(q => q.section === block.section);
        }
        if (block.subject) {
           pool = pool.filter(q => q.subject === block.subject);
        }
        if (block.topic) {
           pool = pool.filter(q => q.topic === block.topic);
        }

        pool = pool.filter(q => !seenIds.has(q.question_id));
        
        const selectedForBlock = rng.shuffle(pool).slice(0, block.count);
        for (const q of selectedForBlock) {
           seenIds.add(q.question_id);
           finalQuestions.push(q);
        }
      }

      // Final questions should be in sequence 1..N based on custom sequence
      return finalQuestions.map((q, i) => ({
        questionId: q.question_id,
        sequence: i + 1,
      }));
    }

    // Start with the smallest known pool by checking indices
    let pool: RenderableQuestion[];
    if (config.yearShift) {
      pool = repo.getPaper(config.yearShift);
    } else if (config.subject) {
      pool = repo.getSubjectBank(config.subject);
    } else {
      pool = repo.getAllQuestions();
    }

    // Apply strict filtering
    if (config.topics && config.topics.length > 0) {
      const allowed = new Set(config.topics);
      pool = pool.filter((q) => q.topic && allowed.has(q.topic));
    }

    if (config.difficulty && config.difficulty.length > 0) {
      const allowed = new Set(config.difficulty);
      pool = pool.filter((q) => q.difficulty && allowed.has(q.difficulty));
    }

    if (config.questionTypes && config.questionTypes.length > 0) {
      const allowed = new Set(config.questionTypes);
      pool = pool.filter(
        (q) => q.question_type && allowed.has(q.question_type),
      );
    }

    if (config.marks && config.marks.length > 0) {
      const allowed = new Set(config.marks);
      pool = pool.filter((q) => q.marks !== undefined && allowed.has(q.marks));
    }

    return this.takeRandom(
      pool,
      config.questionCount || pool.length,
      seed,
      true,
    );
  }

  private static takeRandom(
    questions: RenderableQuestion[],
    count: number,
    seed?: number,
    shuffle: boolean = true,
  ): ExamQuestion[] {
    let selected = questions;

    if (shuffle) {
      const rng = new SeededRandom(seed);
      selected = rng.shuffle(questions);
    }

    // Ensure we do not slice more than available
    const actualCount = Math.min(count, selected.length);
    selected = selected.slice(0, actualCount);

    return selected.map((q, idx) => ({
      questionId: q.question_id,
      sequence: idx + 1,
    }));
  }
}
