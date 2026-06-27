import { openDB, IDBPDatabase } from "idb";
import {
  DATABASE_NAME,
  DATABASE_VERSION,
  STORE_METADATA,
  STORE_QUESTION_CACHE,
  STORE_EXAM_SESSIONS,
  STORE_USER_MUTATIONS,
  STORE_ANALYTICS_SNAPSHOTS,
  STORE_STUDY_METRICS,
  STORE_MISTAKES,
  STORE_BOOKMARKS,
  STORE_CUSTOM_TEMPLATES,
} from "./cache-constants";
import {
  MetadataRecord,
  ExamSessionRecord,
  QuestionCacheRecord,
  GatePrepDB,
} from "./cache-types";
import { CustomTestTemplate } from "@/types/exam.types";

export class IDBManager {
  private static dbPromise: Promise<IDBPDatabase<GatePrepDB>> | null = null;

  public static async initializeDatabase(): Promise<IDBPDatabase<GatePrepDB>> {
    if (!this.dbPromise) {
      if (typeof window === "undefined") {
        return Promise.reject(
          new Error("IndexedDB is not available in non-browser environments."),
        );
      }

      this.dbPromise = openDB<GatePrepDB>(DATABASE_NAME, DATABASE_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_METADATA)) {
            db.createObjectStore(STORE_METADATA, { keyPath: "key" });
          }
          if (!db.objectStoreNames.contains(STORE_QUESTION_CACHE)) {
            db.createObjectStore(STORE_QUESTION_CACHE, {
              keyPath: "question_id",
            });
          }
          if (!db.objectStoreNames.contains(STORE_EXAM_SESSIONS)) {
            db.createObjectStore(STORE_EXAM_SESSIONS, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(STORE_USER_MUTATIONS)) {
            db.createObjectStore(STORE_USER_MUTATIONS, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(STORE_ANALYTICS_SNAPSHOTS)) {
            db.createObjectStore(STORE_ANALYTICS_SNAPSHOTS, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(STORE_STUDY_METRICS)) {
            db.createObjectStore(STORE_STUDY_METRICS, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(STORE_MISTAKES)) {
            db.createObjectStore(STORE_MISTAKES, { keyPath: "questionId" });
          }
          if (!db.objectStoreNames.contains(STORE_BOOKMARKS)) {
            db.createObjectStore(STORE_BOOKMARKS, { keyPath: "questionId" });
          }
          if (!db.objectStoreNames.contains(STORE_CUSTOM_TEMPLATES)) {
            db.createObjectStore(STORE_CUSTOM_TEMPLATES, { keyPath: "id" });
          }
        },
      });
    }
    return this.dbPromise;
  }

  public static async getMetadata(
    key: string,
  ): Promise<MetadataRecord | undefined> {
    try {
      const db = await this.initializeDatabase();
      return await db.get(STORE_METADATA, key);
    } catch {
      return undefined;
    }
  }

  public static async setMetadata(
    key: string,
    value: string | number | boolean,
  ): Promise<void> {
    try {
      const db = await this.initializeDatabase();
      await db.put(STORE_METADATA, { key, value });
    } catch {
      // IndexedDB might fail (e.g. quota, private mode), suppress exceptions matching requirements
    }
  }

  public static async getQuestionCache(): Promise<QuestionCacheRecord[]> {
    try {
      const db = await this.initializeDatabase();
      return await db.getAll(STORE_QUESTION_CACHE);
    } catch {
      return [];
    }
  }

  public static async setQuestionCache(
    questions: QuestionCacheRecord[],
  ): Promise<void> {
    try {
      const db = await this.initializeDatabase();
      const tx = db.transaction(STORE_QUESTION_CACHE, "readwrite");

      for (const question of questions) {
        tx.store.put(question);
      }

      await tx.done;
    } catch {
      // Ignored for fallback to network strategy
    }
  }

  public static async clearQuestionCache(): Promise<void> {
    try {
      const db = await this.initializeDatabase();
      await db.clear(STORE_QUESTION_CACHE);
    } catch {
      // Ignored
    }
  }

  public static async saveExamSession(
    session: ExamSessionRecord,
  ): Promise<void> {
    try {
      const db = await this.initializeDatabase();
      await db.put(STORE_EXAM_SESSIONS, session);
    } catch {
      // Ignored
    }
  }

  public static async loadExamSession(
    id: string,
  ): Promise<ExamSessionRecord | undefined> {
    try {
      const db = await this.initializeDatabase();
      return await db.get(STORE_EXAM_SESSIONS, id);
    } catch {
      return undefined;
    }
  }

  public static async deleteExamSession(id: string): Promise<void> {
    try {
      const db = await this.initializeDatabase();
      await db.delete(STORE_EXAM_SESSIONS, id);
    } catch {
      // Ignored
    }
  }

  public static async getAnalyticsSnapshots(): Promise<import("@/types/analytics.types").AnalyticsSnapshot[]> {
    try {
      const db = await this.initializeDatabase();
      return await db.getAll(STORE_ANALYTICS_SNAPSHOTS);
    } catch {
      return [];
    }
  }

  public static async saveAnalyticsSnapshot(snapshot: import("@/types/analytics.types").AnalyticsSnapshot): Promise<void> {
    try {
      const db = await this.initializeDatabase();
      await db.put(STORE_ANALYTICS_SNAPSHOTS, snapshot);
    } catch {
      // Ignored
    }
  }

  public static async getStudyMetrics(): Promise<(import("@/types/analytics.types").StudyMetrics & { id: string }) | undefined> {
    try {
      const db = await this.initializeDatabase();
      return await db.get(STORE_STUDY_METRICS, "global_metrics");
    } catch {
      return undefined;
    }
  }

  public static async saveStudyMetrics(metrics: import("@/types/analytics.types").StudyMetrics): Promise<void> {
    try {
      const db = await this.initializeDatabase();
      await db.put(STORE_STUDY_METRICS, { id: "global_metrics", ...metrics });
    } catch {
      // Ignored
    }
  }

  public static async getAllExamSessions(): Promise<ExamSessionRecord[]> {
    try {
      const db = await this.initializeDatabase();
      return await db.getAll(STORE_EXAM_SESSIONS);
    } catch {
      return [];
    }
  }

  public static async getAllMistakes(): Promise<import("@/types/study.types").MistakeEntry[]> {
    try {
      const db = await this.initializeDatabase();
      return await db.getAll(STORE_MISTAKES);
    } catch {
      return [];
    }
  }

  public static async saveMistake(mistake: import("@/types/study.types").MistakeEntry): Promise<void> {
    try {
      const db = await this.initializeDatabase();
      await db.put(STORE_MISTAKES, mistake);
    } catch {
      // Ignored
    }
  }
  
  public static async removeMistake(questionId: string): Promise<void> {
    try {
      const db = await this.initializeDatabase();
      await db.delete(STORE_MISTAKES, questionId);
    } catch (e) {
      // Ignored
    }
  }

  public static async getAllBookmarks(): Promise<import("@/types/study.types").BookmarkEntry[]> {
    try {
      const db = await this.initializeDatabase();
      return await db.getAll(STORE_BOOKMARKS);
    } catch {
      return [];
    }
  }

  public static async saveBookmark(bookmark: import("@/types/study.types").BookmarkEntry): Promise<void> {
    try {
      const db = await this.initializeDatabase();
      await db.put(STORE_BOOKMARKS, bookmark);
    } catch {
      // Ignored
    }
  }

  public static async removeBookmark(questionId: string): Promise<void> {
    try {
      const db = await this.initializeDatabase();
      await db.delete(STORE_BOOKMARKS, questionId);
    } catch (e) {
      // Ignored
    }
  }

  // =========== Custom Test Templates ===========
  public static async saveCustomTemplate(template: import("@/types/exam.types").CustomTestTemplate): Promise<void> {
    try {
      const db = await this.initializeDatabase();
      await db.put(STORE_CUSTOM_TEMPLATES, template);
    } catch (e) {
      console.warn("Failed to save template", e);
    }
  }

  public static async getAllCustomTemplates(): Promise<import("@/types/exam.types").CustomTestTemplate[]> {
    try {
      const db = await this.initializeDatabase();
      return await db.getAll(STORE_CUSTOM_TEMPLATES);
    } catch (e) {
      return [];
    }
  }

  public static async deleteCustomTemplate(id: string): Promise<void> {
    try {
      const db = await this.initializeDatabase();
      await db.delete(STORE_CUSTOM_TEMPLATES, id);
    } catch (e) {
      console.warn("Failed to delete template", e);
    }
  }

  // =========== Calendar Events Helpers ===========
  public static async getCalendarEvents(): Promise<import("@/types/calendar.types").CalendarEvent[]> {
    const record = await this.getMetadata("calendar_events");
    if (record && record.value) {
      try {
        return JSON.parse(record.value as string);
      } catch {
        return [];
      }
    }
    return [];
  }

  public static async saveCalendarEvents(events: import("@/types/calendar.types").CalendarEvent[]): Promise<void> {
    await this.setMetadata("calendar_events", JSON.stringify(events));
  }
}
