export interface AnalyticsSnapshot {
  id: string; // date string YYYY-MM-DD
  date: string;
  totalQuestionsAttempted: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalSkipped: number;
  totalTimeSpentMs: number;
  subjectAnalytics: Record<string, SubjectAnalytics>;
  topicAnalytics: Record<string, TopicAnalytics>;
  difficultyAnalytics: Record<string, DifficultyAnalytics>;
  createdAt: string;
}

export interface SubjectAnalytics {
  subject: string;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  timeSpentMs: number;
}

export interface TopicAnalytics {
  topic: string;
  subject: string;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  timeSpentMs: number;
}

export interface DifficultyAnalytics {
  difficulty: number | string;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  timeSpentMs: number;
}

export interface StudyMetrics {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  totalQuestionsSolved: number;
  overallAccuracy: number;
  totalTimeSpentMs: number;
  avgTimePerQuestionMs: number;
}

export interface RecentSessionSummary {
  id: string;
  config: { name: string };
  updatedAt: string;
  status: string;
  startedAt: string;
  attempted: number;
  correct: number;
  accuracy: number; // 0-100, real per-session accuracy
  score: { totalScore: number; maxScore: number };
}

export interface DashboardMetrics {
  overview: StudyMetrics;
  subjectPerformance: SubjectAnalytics[];
  topicPerformance: TopicAnalytics[];
  difficultyPerformance: DifficultyAnalytics[];
  recentSessions: RecentSessionSummary[];
}
