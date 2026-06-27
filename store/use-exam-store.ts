import { create } from "zustand";
import { ExamSessionDraft, TestConfig } from "@/types/exam.types";
import { ExamBuilder } from "@/lib/exam/exam-builder";

interface ExamState {
  currentDraft: ExamSessionDraft | null;
  createDraft: (config: TestConfig) => void;
  clearDraft: () => void;
  loadDraft: (id: string, draft: ExamSessionDraft) => void;
}

export const useExamStore = create<ExamState>((set) => ({
  currentDraft: null,

  createDraft: (config: TestConfig) => {
    const draft = ExamBuilder.generateDraft(config);
    set({ currentDraft: draft });
  },

  clearDraft: () => {
    set({ currentDraft: null });
  },

  loadDraft: (id: string, draft: ExamSessionDraft) => {
    // In a future phase, we might load from IndexedDB by 'id'
    set({ currentDraft: draft });
  },
}));
