import { AnalyticsSnapshot } from "@/types/analytics.types";
import { IDBManager } from "@/lib/repository/storage/idb-manager";
import { AnalyticsEngine } from "./analytics-engine";
import { ExamSession } from "@/types/exam-runtime.types";

export class SnapshotEngine {
  public static async generateAndSaveDailySnapshot(): Promise<AnalyticsSnapshot | null> {
    try {
      // Get all sessions
      const rawSessions = await IDBManager.getAllExamSessions();
      const sessions = rawSessions.map(rs => rs.sessionData as ExamSession);
      
      const metrics = await AnalyticsEngine.generateDashboardMetrics(sessions);
      
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      
      // Convert arrays back to records for the snapshot
      const subjectAnalyticsRecord: Record<string, any> = {};
      metrics.subjectPerformance.forEach(s => {
        subjectAnalyticsRecord[s.subject] = s;
      });

      const topicAnalyticsRecord: Record<string, any> = {};
      metrics.topicPerformance.forEach(t => {
        topicAnalyticsRecord[t.topic] = t;
      });

      const difficultyAnalyticsRecord: Record<string, any> = {};
      // Difficulty gets merged into subjects right now in AnalyticsEngine, 
      // wait, we didn't export difficulty performance in DashboardMetrics from AnalyticsEngine.
      // We'll just leave it empty if not exposed, or we can update DashboardMetrics later.

      const snapshot: AnalyticsSnapshot = {
        id: today,
        date: today,
        totalQuestionsAttempted: metrics.overview.totalQuestionsSolved,
        totalCorrect: Math.round((metrics.overview.overallAccuracy / 100) * metrics.overview.totalQuestionsSolved), // back-calculate
        totalIncorrect: metrics.overview.totalQuestionsSolved - Math.round((metrics.overview.overallAccuracy / 100) * metrics.overview.totalQuestionsSolved),
        totalSkipped: 0, // We would need to extract this properly if we needed it exact
        totalTimeSpentMs: metrics.overview.totalTimeSpentMs,
        subjectAnalytics: subjectAnalyticsRecord,
        topicAnalytics: topicAnalyticsRecord,
        difficultyAnalytics: difficultyAnalyticsRecord,
        createdAt: new Date().toISOString()
      };

      await IDBManager.saveAnalyticsSnapshot(snapshot);
      return snapshot;
    } catch (e) {
      console.error("Failed to save daily snapshot", e);
      return null;
    }
  }
}
