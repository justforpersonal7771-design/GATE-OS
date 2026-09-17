import { RenderableQuestion } from "./question.types";
import { MistakeEntry, BookmarkEntry } from "./study.types";
import { ExamSession } from "./exam-runtime.types";
import { CalendarEvent } from "./calendar.types";

export interface AITokenUsage {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
}

export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached: boolean;
  tokenUsage?: AITokenUsage;
}

export interface AIContext {
  // Current item context
  currentQuestion?: RenderableQuestion;
  currentResponse?: {
    selectedOptions: string[];
    natValue?: string;
    isCorrect: boolean;
    timeSpentSeconds: number;
  };

  // Student profile and overall stats
  studentStats: {
    masteryScore: number;
    readinessScore: number;
    confidenceScore: number;
    studyMomentum: number;
    consistencyScore: number;
    weakestSubject: string;
    strongestSubject: string;
    mostImprovingTopic: string;
    mostDecliningTopic: string;
  };

  // Lists
  weakTopics: string[];
  strongTopics: string[];
  recentMistakes: MistakeEntry[];
  bookmarks: BookmarkEntry[];
  activePlannerTasks: CalendarEvent[];
  recentSessions: ExamSession[];
  revisionQueue: string[]; // Topic names or question IDs
}

export interface AIRequest {
  action: "EXPLAIN" | "HINT" | "SHORTCUT" | "PRACTICE" | "REVISION" | "MISTAKE";
  questionId?: string;
  topic?: string;
  subject?: string;
  bypassCache?: boolean;
}

export interface AIExplanation {
  concept: string;
  steps: string[];
  formulas: string[];
  shortcut?: string;
  personalizedContextNotes?: string;
}

export interface AIPracticeQuestion {
  questionText: string;
  options?: {
    option_id: string;
    content: string;
  }[];
  questionType: "MCQ" | "MSQ" | "NAT";
  natAnswerRange?: {
    min: number;
    max: number;
  };
  explanation: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

export interface AIHint {
  hintLevel1: string; // Subtle clue
  hintLevel2: string; // Direction helper
  hintLevel3: string; // Conceptual breakdown
}

export interface AIRecommendation {
  todaysFocusTopic: string;
  reason: string;
  suggestedAction: string;
}

export interface AIRevisionPlan {
  subject: string;
  priorityTopics: {
    topic: string;
    urgencyReason: string;
    suggestedDurationMin: number;
  }[];
  studyMethodTips: string[];
}
