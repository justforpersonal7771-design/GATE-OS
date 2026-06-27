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
}

export interface BookmarkEntry {
  questionId: string;
  createdAt: string;
  notes: string;
  subject: string;
  topic: string;
  selectedOptions?: string[];
  natValue?: string;
}
