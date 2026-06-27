export interface MistakeEntry {
  questionId: string;
  questionSnapshot?: any;
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
}

export interface BookmarkEntry {
  questionId: string;
  createdAt: string;
  notes: string;
  subject: string;
  topic: string;
  selectedOptions?: string[];
  natValue?: string;

  // Folder & Tag Metadata for Module D
  folders?: string[];
  tags?: string[];
  colorLabel?: string; // hex color code or class
  priority?: 'Low' | 'Medium' | 'High';
  favorite?: boolean;
  pinned?: boolean;
  recentlyViewedAt?: string;
}
