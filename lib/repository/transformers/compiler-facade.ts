import { Question, RenderableQuestion } from "@/types/question.types";
import { normalizeQuestion, NormalizationContext } from "./question-normalizer";

export interface IASTCompiler {
  compile(questions: Question[]): Promise<RenderableQuestion[]>;
}

export class CompilerFacade implements IASTCompiler {
  public async compile(questions: Question[]): Promise<RenderableQuestion[]> {
    return this.compileSynchronously(questions);
  }

  public compileSynchronously(questions: Question[]): RenderableQuestion[] {
    return questions.map((q) => {
      const context: NormalizationContext = {
        year: q.year || "",
        shift: q.shift || "",
      };
      
      return normalizeQuestion(q, context);
    });
  }

  public async compileViaWorker(questions: Question[]): Promise<RenderableQuestion[]> {
    // Stub implementation for future WebWorker processing to prevent UI blocking
    return Promise.resolve(this.compileSynchronously(questions));
  }
}
