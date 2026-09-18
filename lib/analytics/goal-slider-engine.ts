import type { RenderableQuestion } from "@/types/question.types";

// Dynamic exam timing rule shared with ExamTimer/exam-builder (108s per 1-mark question, 216s per 2-mark question).
const SECONDS_PER_MARK = 108;

export interface TopicFrequency {
  subject: string;
  topic: string;
  questionCount: number;
  weightedMarks: number;
  marksShare: number;
}

export interface SubjectFrequency {
  subject: string;
  questionCount: number;
  weightedMarks: number;
  marksShare: number;
  topics: TopicFrequency[];
}

export interface GoalSliderCurvePoint {
  topicsSelected: number;
  syllabusPercent: number;
  marksPercent: number;
}

export interface GoalSliderResult {
  targetPercent: number;
  totalTopics: number;
  includedCount: number;
  includedTopics: TopicFrequency[];
  excludedTopics: TopicFrequency[];
  marksCaptured: number;
  pyqQuestionsCovered: number;
  totalPyqQuestions: number;
  estStudySeconds: number;
}

/** AI-generated practice questions shouldn't skew what's meant to be a real historical PYQ frequency signal. */
export function filterOfficialQuestions(questions: RenderableQuestion[]): RenderableQuestion[] {
  return questions.filter((q) => q.year !== "AI" && !q.question_id.startsWith("ai_"));
}

/** Ranks every (subject, topic) pair by historical marks-weighted PYQ frequency, most important first. */
export function computeTopicFrequencies(questions: RenderableQuestion[]): TopicFrequency[] {
  const map = new Map<string, TopicFrequency>();
  let totalMarks = 0;

  for (const q of questions) {
    if (!q.subject || !q.topic) continue;
    const marks = typeof q.marks === "number" ? q.marks : 0;
    totalMarks += marks;
    const key = `${q.subject}::${q.topic}`;
    const entry = map.get(key);
    if (entry) {
      entry.questionCount += 1;
      entry.weightedMarks += marks;
    } else {
      map.set(key, { subject: q.subject, topic: q.topic, questionCount: 1, weightedMarks: marks, marksShare: 0 });
    }
  }

  return Array.from(map.values())
    .map((entry) => ({ ...entry, marksShare: totalMarks > 0 ? (entry.weightedMarks / totalMarks) * 100 : 0 }))
    .sort((a, b) => b.weightedMarks - a.weightedMarks || b.questionCount - a.questionCount);
}

export function computeSubjectBreakdown(ranked: TopicFrequency[]): SubjectFrequency[] {
  const bySubject = new Map<string, SubjectFrequency>();
  const totalMarks = ranked.reduce((sum, t) => sum + t.weightedMarks, 0);

  for (const t of ranked) {
    const existing = bySubject.get(t.subject);
    if (existing) {
      existing.questionCount += t.questionCount;
      existing.weightedMarks += t.weightedMarks;
      existing.topics.push(t);
    } else {
      bySubject.set(t.subject, { subject: t.subject, questionCount: t.questionCount, weightedMarks: t.weightedMarks, marksShare: 0, topics: [t] });
    }
  }

  return Array.from(bySubject.values())
    .map((s) => ({ ...s, marksShare: totalMarks > 0 ? (s.weightedMarks / totalMarks) * 100 : 0 }))
    .sort((a, b) => b.weightedMarks - a.weightedMarks);
}

/** Cumulative curve data for the chart: syllabus coverage grows linearly by topic count, marks coverage front-loads on high-yield topics. */
export function computeGoalSliderCurve(ranked: TopicFrequency[]): GoalSliderCurvePoint[] {
  const totalTopics = ranked.length;
  const totalMarks = ranked.reduce((sum, t) => sum + t.weightedMarks, 0);
  const points: GoalSliderCurvePoint[] = [{ topicsSelected: 0, syllabusPercent: 0, marksPercent: 0 }];

  let cumulativeMarks = 0;
  ranked.forEach((topic, i) => {
    cumulativeMarks += topic.weightedMarks;
    points.push({
      topicsSelected: i + 1,
      syllabusPercent: totalTopics > 0 ? ((i + 1) / totalTopics) * 100 : 0,
      marksPercent: totalMarks > 0 ? (cumulativeMarks / totalMarks) * 100 : 0,
    });
  });

  return points;
}

/** Given a target syllabus coverage %, returns the prioritized topic set and what it actually buys the learner. */
export function computeGoalSliderResult(questions: RenderableQuestion[], targetPercent: number): GoalSliderResult {
  const ranked = computeTopicFrequencies(questions);
  const totalTopics = ranked.length;
  const clampedTarget = Math.min(100, Math.max(0, targetPercent));
  const includedCount = totalTopics > 0 ? Math.max(1, Math.round((clampedTarget / 100) * totalTopics)) : 0;
  const includedTopics = ranked.slice(0, includedCount);
  const excludedTopics = ranked.slice(includedCount);

  const totalMarks = ranked.reduce((sum, t) => sum + t.weightedMarks, 0);
  const capturedMarks = includedTopics.reduce((sum, t) => sum + t.weightedMarks, 0);
  const includedTopicKeys = new Set(includedTopics.map((t) => `${t.subject}::${t.topic}`));

  let pyqQuestionsCovered = 0;
  let estStudySeconds = 0;
  for (const q of questions) {
    if (!q.subject || !q.topic) continue;
    if (includedTopicKeys.has(`${q.subject}::${q.topic}`)) {
      pyqQuestionsCovered += 1;
      estStudySeconds += (q.marks || 1) * SECONDS_PER_MARK;
    }
  }

  return {
    targetPercent: clampedTarget,
    totalTopics,
    includedCount,
    includedTopics,
    excludedTopics,
    marksCaptured: totalMarks > 0 ? (capturedMarks / totalMarks) * 100 : 0,
    pyqQuestionsCovered,
    totalPyqQuestions: questions.length,
    estStudySeconds,
  };
}
