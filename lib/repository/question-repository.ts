import { buildIndexes, IndexCollection } from "./index-builder";
import {
  Question,
  RenderableQuestion,
  YearShiftData,
} from "@/types/question.types";
import { IDBManager } from "./storage/idb-manager";
import { CompilerFacade } from "./transformers/compiler-facade";
import { AST_VERSION } from "./storage/cache-constants";

export interface RepositoryDiagnostics {
  totalQuestions: number;
  totalSubjects: number;
  totalTopics: number;
  imageQuestions: number;
  multiImageQuestions: number;
  totalImages: number;
  totalLatexNodes: number;
  brokenImageCount: number;
  compilationDurationMs: number;
  indexingDurationMs: number;
  cacheSource: "NETWORK_JSON" | "INDEXEDDB_AST";
  errors: string[];
  imageFailures: {
    unresolvedTokens: string[];
    missingFiles: string[];
  };
}

export interface CustomTestConfig {
  years?: string[];
  subjects?: string[];
  topics?: string[];
  difficulties?: string[];
  limit?: number;
}

type RepoStatus = "IDLE" | "INITIALIZING" | "READY" | "ERROR";

class QuestionRepositorySingleton {
  private static instance: QuestionRepositorySingleton;
  private indexes: IndexCollection | null = null;
  private status: RepoStatus = "IDLE";
  private initPromise: Promise<void> | null = null;
  private diagnostics: RepositoryDiagnostics | null = null;

  private constructor() {}

  public static getInstance(): QuestionRepositorySingleton {
    if (!QuestionRepositorySingleton.instance) {
      QuestionRepositorySingleton.instance = new QuestionRepositorySingleton();
    }
    return QuestionRepositorySingleton.instance;
  }

  public async initialize(
    dataUrl: string = "/data/Aggregated_Output.json",
  ): Promise<void> {
    if (this.status === "READY") return;
    if (this.initPromise) return this.initPromise;

    this.status = "INITIALIZING";

    this.initPromise = (async () => {
      try {
        let questions: RenderableQuestion[] = [];
        let cacheSource: "NETWORK_JSON" | "INDEXEDDB_AST" = "NETWORK_JSON";
        let compilationDurationMs = 0;
        let errors: string[] = [];

        const compileStart = performance.now();

        // ALWAYS Fetch Aggregated_Output.json & Compile to ensure data freshness
        try {
          // Fetch dataset and manifest in parallel
          const [response, manifestResponse] = await Promise.all([
            fetch(dataUrl, { cache: "no-store" }),
            fetch("/data/image-manifest.json", { cache: "no-store" })
          ]);
          
          if (!response.ok) throw new Error("Failed to fetch dataset");
          if (manifestResponse.ok) {
            const manifestData = await manifestResponse.json();
            const ImageResolverModule = await import("@/lib/services/image-resolver");
            ImageResolverModule.ImageResolver.initialize(manifestData);
          } else {
             console.warn("Failed to fetch image-manifest.json, images might not resolve.");
          }

          const rawData: YearShiftData[] = await response.json();

          const rawQuestions: Question[] = [];
          for (const paper of rawData) {
            const yearShiftStr = paper.exam_metadata?.["year-shift"] || "";
            const [year, shift] = yearShiftStr.split("-");
            for (const q of paper.questions) {
              rawQuestions.push({ ...q, year, shift });
            }
          }

          const compiler = new CompilerFacade();
          let compiledQuestions = await compiler.compile(rawQuestions);

          // Deep Freeze
          questions = compiledQuestions.map((q) => {
            return Object.freeze(q);
          });
          
          await IDBManager.clearQuestionCache(); // Clean up old cache data
        } catch(e) {
          console.error("Failed to fetch fresh dataset, attempting to use cached AST as ultimate fallback", e);
          const cachedQuestions = await IDBManager.getQuestionCache();
          if (cachedQuestions && cachedQuestions.length > 0) {
            questions = cachedQuestions;
            cacheSource = "INDEXEDDB_AST";
          } else {
             throw e;
          }
        }

        compilationDurationMs = performance.now() - compileStart;

        // 3. Build Indexes
        const indexStart = performance.now();
        this.indexes = buildIndexes(questions);
        const indexingDurationMs = performance.now() - indexStart;

        // 4. Generate Diagnostics
        let totalImages = 0;
        let totalLatexNodes = 0;
        let imageQuestions = 0;
        let multiImageQuestions = 0;
        let brokenImageCount = 0;
        const missingFiles = new Set<string>();
        const unresolvedTokens = new Set<string>();

        for (const q of questions) {
          let hasImage = false;
          let imageNodeCountInQuestion = 0;

          const checkNode = (n: any) => {
            if (n.type === "image") {
              hasImage = true;
              const urls = n.resolvedUrls?.length ? n.resolvedUrls : [n.resolvedUrl];
              totalImages += urls.length;
              imageNodeCountInQuestion += urls.length;

              if (n.hasError) {
                brokenImageCount++;
                unresolvedTokens.add(n.originalToken);
                missingFiles.add(n.resolvedUrl); // Note: For missing files, track what we attempted
              }
            }
            if (n.type === "latex-inline" || n.type === "latex-display") totalLatexNodes++;
          };

          for (const n of q.contentAst || []) checkNode(n);
          for (const o of q.options || []) {
            for (const n of o.contentAst || []) checkNode(n);
          }

          if (hasImage) imageQuestions++;
          if (imageNodeCountInQuestion > 1) multiImageQuestions++;
        }

        this.diagnostics = {
          totalQuestions: questions.length,
          totalSubjects: this.indexes.questionsBySubject.size,
          totalTopics: this.indexes.questionsByTopic.size,
          imageQuestions,
          multiImageQuestions,
          totalImages,
          totalLatexNodes,
          brokenImageCount,
          compilationDurationMs,
          indexingDurationMs,
          cacheSource,
          errors,
          imageFailures: {
            unresolvedTokens: Array.from(unresolvedTokens),
            missingFiles: Array.from(missingFiles)
          }
        };

        this.status = "READY";
      } catch (error: any) {
        this.status = "ERROR";
        console.error("Repository initialization failed:", error);
        throw error;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  public isReady(): boolean {
    return this.status === "READY" && this.indexes !== null;
  }

  public registerDynamicQuestion(q: RenderableQuestion) {
    this.checkReady();
    if (!this.indexes!.questionsById.has(q.question_id)) {
      this.indexes!.allQuestions.push(q);
      this.indexes!.questionsById.set(q.question_id, q);

      // Add to subject map
      const subList = this.indexes!.questionsBySubject.get(q.subject) || [];
      subList.push(q);
      this.indexes!.questionsBySubject.set(q.subject, subList);

      // Add to topic map
      const topList = this.indexes!.questionsByTopic.get(q.topic) || [];
      topList.push(q);
      this.indexes!.questionsByTopic.set(q.topic, topList);

      // Add to difficulty map
      const diffList = this.indexes!.questionsByDifficulty.get(q.difficulty) || [];
      diffList.push(q);
      this.indexes!.questionsByDifficulty.set(q.difficulty, diffList);

      // Add to section map
      const secList = this.indexes!.questionsBySection.get(q.section) || [];
      secList.push(q);
      this.indexes!.questionsBySection.set(q.section, secList);

      // Add to year_shift map
      const paperList = this.indexes!.questionsByYearShift.get(q.year_shift) || [];
      paperList.push(q);
      this.indexes!.questionsByYearShift.set(q.year_shift, paperList);
    }
  }

  private checkReady() {
    if (!this.isReady() || !this.indexes) {
      throw new Error(
        "QuestionRepository is not initialized. Call initialize() first.",
      );
    }
  }

  public getDiagnostics(): RepositoryDiagnostics | null {
    return this.diagnostics;
  }

  public getQuestion(id: string): RenderableQuestion | undefined {
    this.checkReady();
    return this.indexes!.questionsById.get(id);
  }

  public getQuestionById(id: string): RenderableQuestion | undefined {
    return this.getQuestion(id);
  }

  public getQuestionsByYear(year: string): RenderableQuestion[] {
    this.checkReady();
    return this.indexes!.questionsByYear.get(year) || [];
  }

  public getQuestionsByShift(shift: string): RenderableQuestion[] {
    this.checkReady();
    return this.indexes!.questionsByShift.get(shift) || [];
  }

  public getQuestionsBySubject(subject: string): RenderableQuestion[] {
    this.checkReady();
    return this.indexes!.questionsBySubject.get(subject) || [];
  }

  public getQuestionsByTopic(topic: string): RenderableQuestion[] {
    this.checkReady();
    return this.indexes!.questionsByTopic.get(topic) || [];
  }

  public getQuestionsByDifficulty(difficulty: string): RenderableQuestion[] {
    this.checkReady();
    return this.indexes!.questionsByDifficulty.get(difficulty) || [];
  }

  public getAllQuestions(): RenderableQuestion[] {
    this.checkReady();
    return this.indexes!.allQuestions;
  }

  public getUniqueSubjects(): string[] {
    this.checkReady();
    return Array.from(this.indexes!.questionsBySubject.keys());
  }

  public getUniqueTopics(): string[] {
    this.checkReady();
    return Array.from(this.indexes!.questionsByTopic.keys());
  }

  public getPaper(yearShift: string): RenderableQuestion[] {
    this.checkReady();
    return this.indexes!.questionsByYearShift.get(yearShift) || [];
  }

  public getSubjectBank(subject: string): RenderableQuestion[] {
    this.checkReady();
    return this.indexes!.questionsBySubject.get(subject) || [];
  }

  public getAvailableSubjects(): string[] {
    this.checkReady();
    return Array.from(this.indexes!.questionsBySubject.keys());
  }

  public getAvailableTopics(subject?: string): string[] {
    this.checkReady();
    if (subject) {
      const bank = this.getSubjectBank(subject);
      const topics = new Set<string>();
      for (const q of bank) if (q.topic) topics.add(q.topic);
      return Array.from(topics);
    }
    return Array.from(this.indexes!.questionsByTopic.keys());
  }

  public getAvailableSections(): string[] {
    this.checkReady();
    return Array.from(this.indexes!.questionsBySection.keys());
  }

  public getQuestionsBySection(section: string): RenderableQuestion[] {
    this.checkReady();
    return this.indexes!.questionsBySection.get(section) || [];
  }

  public getAvailablePapers(): string[] {
    this.checkReady();
    return Array.from(this.indexes!.questionsByYearShift.keys());
  }

  public generateDiagnostics(): RepositoryDiagnostics {
    this.checkReady();
    return this.diagnostics!;
  }

  public buildCustomTest(config: CustomTestConfig): RenderableQuestion[] {
    this.checkReady();

    let pool = this.indexes!.allQuestions;

    if (config.years && config.years.length > 0) {
      const yearSet = new Set(config.years);
      pool = pool.filter((q) => q.year && yearSet.has(q.year));
    }

    if (config.subjects && config.subjects.length > 0) {
      const subSet = new Set(config.subjects);
      pool = pool.filter((q) => q.subject && subSet.has(q.subject));
    }

    if (config.topics && config.topics.length > 0) {
      const topSet = new Set(config.topics);
      pool = pool.filter((q) => q.topic && topSet.has(q.topic));
    }

    if (config.difficulties && config.difficulties.length > 0) {
      const diffSet = new Set(config.difficulties);
      pool = pool.filter((q) => q.difficulty && diffSet.has(q.difficulty));
    }

    if (config.limit && config.limit > 0) {
      pool = pool.slice(0, config.limit);
    }

    return pool;
  }
}

export const QuestionRepository = QuestionRepositorySingleton.getInstance();
