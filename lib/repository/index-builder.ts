import { RenderableQuestion } from "@/types/question.types";

export interface IndexCollection {
  allQuestions: RenderableQuestion[];
  questionsById: Map<string, RenderableQuestion>;
  questionsByYear: Map<string, RenderableQuestion[]>;
  questionsByShift: Map<string, RenderableQuestion[]>;
  questionsByYearShift: Map<string, RenderableQuestion[]>;
  questionsBySection: Map<string, RenderableQuestion[]>;
  questionsBySubject: Map<string, RenderableQuestion[]>;
  questionsByTopic: Map<string, RenderableQuestion[]>;
  questionsByDifficulty: Map<string, RenderableQuestion[]>;
  questionsByType: Map<string, RenderableQuestion[]>;
  questionsByMarks: Map<number, RenderableQuestion[]>;
}

export function buildIndexes(questions: RenderableQuestion[]): IndexCollection {
  const indexes: IndexCollection = {
    allQuestions: questions,
    questionsById: new Map(),
    questionsByYear: new Map(),
    questionsByShift: new Map(),
    questionsByYearShift: new Map(),
    questionsBySection: new Map(),
    questionsBySubject: new Map(),
    questionsByTopic: new Map(),
    questionsByDifficulty: new Map(),
    questionsByType: new Map(),
    questionsByMarks: new Map(),
  };

  for (const q of questions) {
    if (q.question_id) {
      indexes.questionsById.set(q.question_id, q);
    }

    if (q.year) {
      if (!indexes.questionsByYear.has(q.year))
        indexes.questionsByYear.set(q.year, []);
      indexes.questionsByYear.get(q.year)!.push(q);
    }

    if (q.shift) {
      if (!indexes.questionsByShift.has(q.shift))
        indexes.questionsByShift.set(q.shift, []);
      indexes.questionsByShift.get(q.shift)!.push(q);
    }

    if (q.year_shift) {
      if (!indexes.questionsByYearShift.has(q.year_shift))
        indexes.questionsByYearShift.set(q.year_shift, []);
      indexes.questionsByYearShift.get(q.year_shift)!.push(q);
    }

    if (q.section) {
      if (!indexes.questionsBySection.has(q.section))
        indexes.questionsBySection.set(q.section, []);
      indexes.questionsBySection.get(q.section)!.push(q);
    }

    if (q.subject) {
      if (!indexes.questionsBySubject.has(q.subject))
        indexes.questionsBySubject.set(q.subject, []);
      indexes.questionsBySubject.get(q.subject)!.push(q);
    }

    if (q.topic) {
      if (!indexes.questionsByTopic.has(q.topic))
        indexes.questionsByTopic.set(q.topic, []);
      indexes.questionsByTopic.get(q.topic)!.push(q);
    }

    if (q.difficulty) {
      if (!indexes.questionsByDifficulty.has(q.difficulty))
        indexes.questionsByDifficulty.set(q.difficulty, []);
      indexes.questionsByDifficulty.get(q.difficulty)!.push(q);
    }

    if (q.question_type) {
      if (!indexes.questionsByType.has(q.question_type))
        indexes.questionsByType.set(q.question_type, []);
      indexes.questionsByType.get(q.question_type)!.push(q);
    }

    if (q.marks !== undefined) {
      if (!indexes.questionsByMarks.has(q.marks))
        indexes.questionsByMarks.set(q.marks, []);
      indexes.questionsByMarks.get(q.marks)!.push(q);
    }
  }

  return indexes;
}
