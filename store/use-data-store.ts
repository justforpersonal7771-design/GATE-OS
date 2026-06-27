import { create } from "zustand";
import {
  QuestionRepository,
  RepositoryDiagnostics,
} from "@/lib/repository/question-repository";

interface DataState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  totalQuestions: number;
  totalSubjects: number;
  totalTopics: number;
  diagnostics: RepositoryDiagnostics | null;

  initializeData: (url?: string) => Promise<void>;
  loadRepository: (url?: string) => Promise<void>;
  refreshRepository: (url?: string) => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  isInitialized: false,
  isLoading: false,
  error: null,
  totalQuestions: 0,
  totalSubjects: 0,
  totalTopics: 0,
  diagnostics: null,

  initializeData: async (url = "/data/Aggregated_Output.json") => {
    return get().loadRepository(url);
  },

  loadRepository: async (url = "/data/Aggregated_Output.json") => {
    // Avoid re-initialization if already loaded
    if (get().isInitialized || get().isLoading) return;

    set({ isLoading: true, error: null });

    try {
      await QuestionRepository.initialize(url);
      const diagnostics = QuestionRepository.generateDiagnostics();

      set({
        isInitialized: true,
        isLoading: false,
        totalQuestions: diagnostics.totalQuestions,
        totalSubjects: diagnostics.totalSubjects,
        totalTopics: diagnostics.totalTopics,
        diagnostics: diagnostics,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || "Failed to initialize question repository.",
      });
    }
  },

  refreshRepository: async (url = "/data/Aggregated_Output.json") => {
    set({ isLoading: true, error: null });
    try {
      if (!QuestionRepository.isReady()) {
        await QuestionRepository.initialize(url);
      }

      const diagnostics = QuestionRepository.generateDiagnostics();
      set({
        isInitialized: true,
        isLoading: false,
        totalQuestions: diagnostics.totalQuestions,
        totalSubjects: diagnostics.totalSubjects,
        totalTopics: diagnostics.totalTopics,
        diagnostics: diagnostics,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || "Failed to refresh question repository.",
      });
    }
  },
}));
