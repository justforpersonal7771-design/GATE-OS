import { ExamSessionDraft } from "./exam.types";

export type ExamStatus = "NOT_STARTED" | "IN_PROGRESS" | "PAUSED" | "SUBMITTED";

export type QuestionStatus = "NOT_VISITED" | "VISITED" | "ANSWERED" | "MARKED" | "MARKED_AND_ANSWERED";

export interface QuestionResponse {
  questionId: string;
  status: QuestionStatus;
  selectedOptions?: string[];
  natValue?: string;
  timeSpentSeconds: number;
}

export interface ExamSession {
  id: string;
  draftId: string;
  draftConfig: ExamSessionDraft;
  status: ExamStatus;
  startedAt: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  responses: Record<string, QuestionResponse>;
  elapsedSeconds: number;
  updatedAt?: string;
}
