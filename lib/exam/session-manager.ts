import { ExamSessionDraft } from "@/types/exam.types";
import { ExamSession, QuestionResponse } from "@/types/exam-runtime.types";
import { IDBManager } from "@/lib/repository/storage/idb-manager";

export class SessionManager {
  public static createSessionFromDraft(draft: ExamSessionDraft): ExamSession {
    console.log(`[Diagnostic] Creating session from draft: ${draft.id}`);
    const responses: Record<string, QuestionResponse> = {};
    for (const q of draft.questions) {
      responses[q.questionId] = {
        questionId: q.questionId,
        status: "NOT_VISITED",
        timeSpentSeconds: 0,
      };
    }

    if (draft.questions.length > 0) {
      responses[draft.questions[0].questionId].status = "VISITED";
    }

    return {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString(),
      draftId: draft.id,
      draftConfig: draft,
      status: "IN_PROGRESS",
      startedAt: new Date().toISOString(),
      currentQuestionIndex: 0,
      totalQuestions: draft.questions.length,
      responses,
      elapsedSeconds: 0,
    };
  }

  public static async saveToHistory(session: ExamSession): Promise<void> {
    console.log(`[Diagnostic] Saving session to history: ${session.id}`);
    await IDBManager.saveExamSession({
      id: session.id, // Save with its real uuid so it doesn't overwrite 'active_session'
      sessionData: session,
      updatedAt: new Date().toISOString(),
    });
  }

  public static async serializeSession(session: ExamSession): Promise<void> {
    console.log(`[Diagnostic] Serializing active session: ${session.id}`);
    await IDBManager.saveExamSession({
      id: "active_session",
      sessionData: session,
      updatedAt: new Date().toISOString(),
    });
  }

  public static async restoreSession(): Promise<ExamSession | null> {
    console.log(`[Diagnostic] Restoring active_session`);
    const record = await IDBManager.loadExamSession("active_session");
    if (record && record.sessionData) {
      console.log(`[Diagnostic] Successfully loaded active_session`);
      return record.sessionData as ExamSession;
    }
    console.log(`[Diagnostic] No active_session found`);
    return null;
  }

  public static async clearSession(): Promise<void> {
    await IDBManager.deleteExamSession("active_session");
  }

  /** Archives a still-in-progress/paused session under its own id so it isn't silently
   * lost when a new session claims the single "active_session" slot. Distinct from
   * saveToHistory (submitted results) — these are abandoned/incomplete attempts, kept so
   * the student can find and resume them later. */
  public static async archiveIncomplete(session: ExamSession): Promise<void> {
    if (session.status === "SUBMITTED") return;
    await IDBManager.saveExamSession({
      id: session.id,
      sessionData: session,
      updatedAt: new Date().toISOString(),
    });
  }

  /** Incomplete (not submitted) sessions archived via archiveIncomplete, excluding the
   * fixed "active_session" slot itself. */
  public static async getIncompleteSessions(): Promise<ExamSession[]> {
    const all = await IDBManager.getAllExamSessions();
    return all
      .filter((r) => r.id !== "active_session")
      .map((r) => r.sessionData as ExamSession)
      .filter((s) => s && s.status !== "SUBMITTED");
  }

  public static async discardIncomplete(sessionId: string): Promise<void> {
    await IDBManager.deleteExamSession(sessionId);
  }
}
