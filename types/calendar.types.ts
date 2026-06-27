export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  category: "Study" | "Revision" | "Mock Test" | "Bookmark Review" | "Mistakes Review" | "Custom";
  date: string; // YYYY-MM-DD
  color: string;
  priority: "Low" | "Medium" | "High";
  completed: boolean;

  // Study Schedule Engine Extensions (Part 7)
  subject?: string;
  topic?: string;
  section?: string;
  studyType: "Study" | "Revision" | "Mock Test" | "Custom Test" | "Mistakes" | "Bookmarks" | "Weak Topics" | "Random Practice";
  difficulty?: "Easy" | "Medium" | "Hard";
  targetQuestions?: number;
  timeRangeType: "date_only" | "start_time" | "start_end" | "duration";
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  durationMin?: number; // Duration in minutes for "duration" timeRangeType
  estimatedDurationMin?: number;
  revisionCycle: "One Time" | "Daily" | "Weekly" | "Every 3 Days" | "Every 7 Days" | "Every 14 Days" | "Every Month";
  status: "Pending" | "In Progress" | "Completed" | "Skipped" | "Cancelled";
  
  // Progress Tracking details
  completionPercentage?: number;
  questionsSolved?: number;
  accuracy?: number;
  actualDurationMin?: number;
  completionDate?: string;
  notes?: string;
  reminderToggle?: boolean;
  repeatPattern?: string;
}
