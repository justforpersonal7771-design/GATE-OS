export type ExamType =
  | "GRAND_MOCK"
  | "YEAR_PAPER"
  | "SUBJECT_TEST"
  | "TOPIC_TEST"
  | "SECTION_TEST"
  | "CUSTOM_TEST";

export interface CustomTestBlock {
  id: string;
  yearShift?: string;
  section?: string;
  subject?: string;
  topic?: string;
  count: number;
}

export interface CustomTestTemplate {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  blocks: CustomTestBlock[];
}

export interface TestConfig {
  examType: ExamType;
  yearShift?: string;
  subject?: string;
  section?: string;
  topics?: string[];
  difficulty?: string[];
  questionTypes?: string[];
  marks?: number[];
  questionCount?: number;
  seed?: number;
  customBlocks?: CustomTestBlock[];
}

export interface ExamQuestion {
  questionId: string;
  sequence: number;
}

export interface ExamSessionDraft {
  id: string;
  config: TestConfig;
  questions: ExamQuestion[];
  createdAt: string;
}
