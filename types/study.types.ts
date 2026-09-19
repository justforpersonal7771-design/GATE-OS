import { GoalTag } from "./exam.types";

export interface MistakeEntry {
  questionId: string;
  questionSnapshot?: any;
  // The Focus Target goal active when this mistake was most recently made, if any —
  // lets the UI show which mistakes trace back to a goal-scoped test.
  sourceGoalTag?: GoalTag;
  firstSeen: string;
  lastReviewed: string | null;
  reviewCount: number;
  mastered: boolean;
  subject: string;
  topic: string;
  difficulty: number | string;
  selectedOptions?: string[];
  natValue?: string;
  notes?: string;

  // Classifications & Statistics for Module D
  category?: 'Concept Error' | 'Calculation Error' | 'Guess' | 'Time Pressure' | 'Reading Error' | 'Silly Mistake' | 'Confidence Error';
  occurrences?: number; // count of incorrect attempts
  lastSeen?: string;    // ISO date string
  solvedCount?: number; // count of correct attempts on retry
  mastery?: number;     // 0-100 score
  confidence?: number;  // 0-100 score
  revisionStatus?: 'Very High Priority' | 'High' | 'Medium' | 'Low' | 'Completed';
  retryCount?: number;  // total retries attempted

  // AI-generated diagnostic insights
  aiCommonMistakeAnalysis?: string;
  aiRootCause?: string;
  aiLearningRecommendation?: string;
  aiRetryRecommendation?: string;
}

export interface BookmarkEntry {
  questionId: string;
  createdAt: string;
  notes: string;
  subject: string;
  topic: string;
  selectedOptions?: string[];
  natValue?: string;
  // The Focus Target goal active in the session this bookmark was created during, if any.
  sourceGoalTag?: GoalTag;

  // Folder & Tag Metadata for Module D
  folders?: string[];
  tags?: string[];
  colorLabel?: string; // hex color code or class
  priority?: 'Low' | 'Medium' | 'High';
  favorite?: boolean;
  pinned?: boolean;
  recentlyViewedAt?: string;

  // AI-generated workspace insights
  aiExplanation?: string;
  aiShortcut?: string;
  aiFormula?: string;
  aiPracticeQuestions?: string; // stringified JSON
  personalObservations?: string;
  isShortcutOnly?: boolean;
}
