import { create } from "zustand";
import { DashboardMetrics, AnalyticsSnapshot } from "@/types/analytics.types";
import { IDBManager } from "@/lib/repository/storage/idb-manager";
import { AnalyticsEngine } from "@/lib/analytics/analytics-engine";
import { ExamSession } from "@/types/exam-runtime.types";
import { SnapshotEngine } from "@/lib/analytics/snapshot-engine";

interface AnalyticsState {
  dashboardMetrics: DashboardMetrics | null;
  snapshots: AnalyticsSnapshot[];
  selectedRange: string;
  loading: boolean;
  error: string | null;
  loadAnalytics: () => Promise<void>;
  refreshAnalytics: () => Promise<void>;
  changeRange: (range: string) => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  dashboardMetrics: null,
  snapshots: [],
  selectedRange: "all_time",
  loading: false,
  error: null,

  loadAnalytics: async () => {
    // Return cached if exists to avoid reloading UI every time
    if (get().dashboardMetrics) return;
    await get().refreshAnalytics();
  },

  refreshAnalytics: async () => {
    set({ loading: true, error: null });
    try {
      // 1. Fetch raw exam sessions from IDB
      const rawSessions = await IDBManager.getAllExamSessions();
      
      // Parse them into ExamSession
      const sessions = rawSessions.map(rs => rs.sessionData as ExamSession);

      // 2. Generate stats
      const dashboardMetrics = await AnalyticsEngine.generateDashboardMetrics(sessions);

      // 3. Save overview
      await IDBManager.saveStudyMetrics(dashboardMetrics.overview);

      // 4. Update daily snapshot immediately
      await SnapshotEngine.generateAndSaveDailySnapshot();
      
      const snapshots = await IDBManager.getAnalyticsSnapshots();

      // 5. Update store
      set({ dashboardMetrics, snapshots, loading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to load analytics", loading: false });
    }
  },

  changeRange: (range: string) => {
    set({ selectedRange: range });
  }
}));
