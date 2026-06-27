import { RenderableQuestion } from "@/types/question.types";
import { MistakeEntry, BookmarkEntry } from "@/types/study.types";
import { ExamSession } from "@/types/exam-runtime.types";
import { TopicMastery } from "./MasteryEngine";

export class FocusEngine {
  public static analyzeFocus(
    allQuestions: RenderableQuestion[],
    sessions: ExamSession[],
    mistakes: MistakeEntry[],
    bookmarks: BookmarkEntry[],
    topicMastery: Record<string, TopicMastery>
  ) {
    const subjects = Array.from(new Set(allQuestions.map(q => q.subject || "General")));

    // Calculate subject-level stats
    const subjectStats: Record<string, { totalScore: number; count: number; attempted: number; correct: number }> = {};
    subjects.forEach(sub => {
      subjectStats[sub] = { totalScore: 0, count: 0, attempted: 0, correct: 0 };
    });

    Object.values(topicMastery).forEach(m => {
      if (subjectStats[m.subject]) {
        subjectStats[m.subject].totalScore += m.score;
        subjectStats[m.subject].count++;
        subjectStats[m.subject].attempted += m.totalAttempts;
        subjectStats[m.subject].correct += m.correctCount;
      }
    });

    let weakestSubject = "General Aptitude (GA)";
    let weakestScore = 101;
    let strongestSubject = "General Aptitude (GA)";
    let strongestScore = -1;

    Object.entries(subjectStats).forEach(([subject, stats]) => {
      if (stats.attempted > 0) {
        const avgScore = stats.totalScore / (stats.count || 1);
        if (avgScore < weakestScore) {
          weakestScore = avgScore;
          weakestSubject = subject;
        }
        if (avgScore > strongestScore) {
          strongestScore = avgScore;
          strongestSubject = subject;
        }
      }
    });

    // Fallback if no questions have been attempted yet
    if (strongestScore === -1) {
      strongestSubject = subjects[0] || "General Aptitude (GA)";
      weakestSubject = subjects[1] || "Core CS";
    }

    // Dynamic improving/declining topics based on session timeline
    const sortedSessions = [...sessions]
      .filter(s => s.status === "SUBMITTED")
      .sort((a, b) => new Date(a.startedAt || 0).getTime() - new Date(b.startedAt || 0).getTime());

    const half = Math.ceil(sortedSessions.length / 2);
    const firstHalfSessions = sortedSessions.slice(0, half);
    const secondHalfSessions = sortedSessions.slice(half);

    // Topic performance in first vs second half
    const topicTrend: Record<string, { firstCorrect: number; firstTotal: number; secondCorrect: number; secondTotal: number }> = {};

    const processHalf = (halfSessions: ExamSession[], type: 'first' | 'second') => {
      halfSessions.forEach(s => {
        Object.values(s.responses || {}).forEach(r => {
          const q = allQuestions.find(quest => quest.question_id === r.questionId);
          if (!q || !q.topic) return;

          const isAttempted = ["ANSWERED", "MARKED_AND_ANSWERED"].includes(r.status);
          if (!isAttempted) return;

          if (!topicTrend[q.topic]) {
            topicTrend[q.topic] = { firstCorrect: 0, firstTotal: 0, secondCorrect: 0, secondTotal: 0 };
          }

          let isCorrect = false;
          if (q.question_type === "MCQ" || q.question_type === "MSQ") {
            const correctOpts = (q.options || []).filter(o => o.is_correct).map(o => o.option_id).sort().join(",");
            const userOpts = (r.selectedOptions || []).sort().join(",");
            isCorrect = correctOpts === userOpts;
          } else if (q.question_type === "NAT" && q.nat_answer_range && r.natValue) {
            const val = parseFloat(r.natValue);
            isCorrect = !isNaN(val) && val >= q.nat_answer_range.min && val <= q.nat_answer_range.max;
          }

          if (type === 'first') {
            topicTrend[q.topic].firstTotal++;
            if (isCorrect) topicTrend[q.topic].firstCorrect++;
          } else {
            topicTrend[q.topic].secondTotal++;
            if (isCorrect) topicTrend[q.topic].secondCorrect++;
          }
        });
      });
    };

    processHalf(firstHalfSessions, 'first');
    processHalf(secondHalfSessions, 'second');

    let mostImprovingTopic = "";
    let maxImprovement = -999;
    let mostDecliningTopic = "";
    let maxDecline = -999;

    Object.entries(topicTrend).forEach(([topic, stats]) => {
      if (stats.firstTotal > 0 && stats.secondTotal > 0) {
        const acc1 = stats.firstCorrect / stats.firstTotal;
        const acc2 = stats.secondCorrect / stats.secondTotal;
        const diff = acc2 - acc1;
        
        if (diff > maxImprovement) {
          maxImprovement = diff;
          mostImprovingTopic = topic;
        }
        if (-diff > maxDecline) {
          maxDecline = -diff;
          mostDecliningTopic = topic;
        }
      }
    });

    // Fallbacks if trends cannot be computed
    const attemptedTopics = Object.values(topicMastery).filter(t => t.totalAttempts > 0);
    if (!mostImprovingTopic && attemptedTopics.length > 0) {
      mostImprovingTopic = attemptedTopics.sort((a,b) => b.score - a.score)[0].topic;
    }
    if (!mostDecliningTopic && attemptedTopics.length > 0) {
      mostDecliningTopic = attemptedTopics.sort((a,b) => a.score - b.score)[0].topic;
    }

    // Recently ignored topics (topics with mistakes/bookmarks but no activity in the last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentlyAttemptedTopics = new Set<string>();
    sessions.forEach(s => {
      if (s.startedAt && new Date(s.startedAt) >= sevenDaysAgo) {
        Object.values(s.responses || {}).forEach(r => {
          const q = allQuestions.find(quest => quest.question_id === r.questionId);
          if (q && q.topic) recentlyAttemptedTopics.add(q.topic);
        });
      }
    });

    const recentlyIgnoredTopics = Array.from(new Set([
      ...mistakes.filter(m => !m.mastered).map(m => m.topic),
      ...bookmarks.map(b => b.topic)
    ])).filter(topic => topic && !recentlyAttemptedTopics.has(topic)).slice(0, 3);

    // Frequently skipped questions (visited but unattempted in past sessions)
    const skipCount: Record<string, number> = {};
    sessions.forEach(s => {
      Object.values(s.responses || {}).forEach(r => {
        if (r.status === "VISITED") {
          skipCount[r.questionId] = (skipCount[r.questionId] || 0) + 1;
        }
      });
    });

    const frequentlySkippedQuestions = Object.entries(skipCount)
      .sort((a, b) => b[1] - a[1])
      .map(([qid]) => qid)
      .slice(0, 5);

    return {
      weakestSubject,
      strongestSubject,
      mostImprovingTopic: mostImprovingTopic || "None yet",
      mostDecliningTopic: mostDecliningTopic || "None yet",
      recentlyIgnoredTopics,
      frequentlySkippedQuestions
    };
  }
}
