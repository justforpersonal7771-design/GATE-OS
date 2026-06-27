import { create } from "zustand";
import { MistakeEntry, BookmarkEntry } from "@/types/study.types";
import { IDBManager } from "@/lib/repository/storage/idb-manager";
import { MistakeEngine } from "@/lib/analytics/mistake-engine";

interface StudyState {
  mistakes: MistakeEntry[];
  bookmarks: BookmarkEntry[];
  loading: boolean;
  loadStudyData: () => Promise<void>;
  
  // Bookmarks
  addBookmark: (questionId: string, notes: string, subject: string, topic: string, selectedOptions?: string[], natValue?: string) => Promise<void>;
  removeBookmark: (questionId: string) => Promise<void>;
  updateBookmarkNotes: (questionId: string, notes: string) => Promise<void>;
  
  // Mistakes
  markMistakeMastered: (questionId: string) => Promise<void>;
  removeMistake: (questionId: string) => Promise<void>;
  recordMistakeReview: (questionId: string) => Promise<void>;
  updateMistakeNotes: (questionId: string, notes: string) => Promise<void>;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  mistakes: [],
  bookmarks: [],
  loading: false,

  loadStudyData: async () => {
    set({ loading: true });
    const mistakes = await IDBManager.getAllMistakes();
    const bookmarks = await IDBManager.getAllBookmarks();
    set({ mistakes, bookmarks, loading: false });
  },

  addBookmark: async (questionId, notes, subject, topic, selectedOptions, natValue) => {
    const newBookmark: BookmarkEntry = {
      questionId,
      createdAt: new Date().toISOString(),
      notes,
      subject,
      topic,
      selectedOptions,
      natValue
    };
    await IDBManager.saveBookmark(newBookmark);
    await get().loadStudyData();
  },

  removeBookmark: async (questionId) => {
    await IDBManager.removeBookmark(questionId);
    await get().loadStudyData();
  },

  updateBookmarkNotes: async (questionId, notes) => {
    const { bookmarks } = get();
    const existing = bookmarks.find(b => b.questionId === questionId);
    if (existing) {
       existing.notes = notes;
       await IDBManager.saveBookmark(existing);
       await get().loadStudyData();
    }
  },

  markMistakeMastered: async (questionId) => {
    await MistakeEngine.markMastered(questionId);
    await get().loadStudyData();
  },

  removeMistake: async (questionId) => {
     await IDBManager.removeMistake(questionId);
     await get().loadStudyData();
  },

  recordMistakeReview: async (questionId) => {
     await MistakeEngine.recordReview(questionId);
     await get().loadStudyData();
  },

  updateMistakeNotes: async (questionId, notes) => {
    const { mistakes } = get();
    const existing = mistakes.find(m => m.questionId === questionId);
    if (existing) {
      existing.notes = notes;
      await IDBManager.saveMistake(existing);
      await get().loadStudyData();
    }
  }
}));
