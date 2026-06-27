import { RenderNode } from "./ast.types";

export type QuestionType = "MCQ" | "MSQ" | "NAT";
export type DifficultyLevel = "Easy" | "Moderate" | "Hard";

export interface Option {
  option_id: string;
  text: string;
  is_correct: boolean;
  has_image: boolean;
}

export interface RenderableOption {
  option_id: string;
  is_correct: boolean;
  optionTextRaw: string;
  contentAst: RenderNode[];
}

export interface NatAnswerRange {
  min: number;
  max: number;
}

export interface Question {
  question_no: number;
  question_id: string;
  question_type: QuestionType;
  marks: number;
  section: string;
  subject: string;
  topic: string;
  difficulty: DifficultyLevel;
  question_text: string;
  has_image: boolean;
  images_required: string[];
  options: Option[];
  nat_answer_range?: NatAnswerRange;
  // Included the year and shift from parent for easier flattened access
  year?: string;
  shift?: string;
}

export interface RenderableQuestion {
  question_no: number;
  question_id: string;
  question_type: QuestionType;
  marks: number;
  section: string;
  subject: string;
  topic: string;
  difficulty: DifficultyLevel;
  year: string;
  shift: string;
  year_shift: string;

  questionTextRaw: string;
  contentAst: RenderNode[];

  options: RenderableOption[];
  nat_answer_range?: NatAnswerRange;

  has_image: boolean;
  requires_latex: boolean;
}

export interface YearShiftData {
  exam_metadata: {
    "year-shift": string;
  };
  questions: Question[];
}
