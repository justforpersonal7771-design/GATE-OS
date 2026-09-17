import { RenderableQuestion } from "@/types/question.types";
import { DBSchema } from "idb";
import { AnalyticsSnapshot, StudyMetrics } from "@/types/analytics.types";
import { MistakeEntry, BookmarkEntry } from "@/types/study.types";
import { CustomTestTemplate } from "@/types/exam.types";

export interface MetadataRecord {
  key: string;
  value: string | number | boolean;
}

export interface ExamSessionRecord {
  id: string;
  sessionData: unknown;
  updatedAt: string;
}

export interface UserMutationRecord {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
}

export type QuestionCacheRecord = RenderableQuestion;

export interface GatePrepDB extends DBSchema {
  Metadata: {
    key: string;
    value: MetadataRecord;
  };
  QuestionCache: {
    key: string;
    value: QuestionCacheRecord;
  };
  ExamSessions: {
    key: string;
    value: ExamSessionRecord;
  };
  UserMutations: {
    key: string;
    value: UserMutationRecord;
  };
  AnalyticsSnapshots: {
    key: string;
    value: AnalyticsSnapshot;
  };
  StudyMetrics: {
    key: string;
    value: StudyMetrics & { id: string };
  };
  Mistakes: {
    key: string;
    value: MistakeEntry;
  };
  Bookmarks: {
    key: string;
    value: BookmarkEntry;
  };
  CustomTemplates: {
    key: string;
    value: CustomTestTemplate;
  };
  AIResponses: {
    key: string;
    value: AIResponseRecord;
  };
  AIGeneratedQuestions: {
    key: string;
    value: RenderableQuestion;
  };
  AIMemory: {
    key: string;
    value: AIMemoryRecord;
  };
}

export interface AIResponseRecord {
  promptHash: string;
  response: string;
  createdDate: string;
  questionId?: string;
  topic?: string;
  ttl: number; // TTL timestamp in milliseconds
}

export interface AIMemoryRecord {
  key: string;
  value: any;
  updatedAt: string;
}
