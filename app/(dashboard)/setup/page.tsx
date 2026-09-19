"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { useDataStore } from "@/store/use-data-store";
import { useExamStore } from "@/store/use-exam-store";
import { useExamRuntimeStore } from "@/store/use-exam-runtime-store";
import { QuestionRepository } from "@/lib/repository/question-repository";
import { ExamType, TestConfig, ExamSessionDraft } from "@/types/exam.types";
import { CustomTestBuilder } from "@/components/exam/custom-test-builder";
import { Settings, Play, ServerCog, Target, FileText, CheckCircle2, Sparkles, ChevronDown, ChevronUp, ChevronRight, Search, X } from "lucide-react";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { AstNodeRenderer } from "@/components/exam/ast-node-renderer";
import { motion, AnimatePresence } from "motion/react";
import { MathJaxContext } from "better-react-mathjax";
import { useGoalSliderStore, GOAL_SLIDER_DEFAULT_PERCENT } from "@/store/use-goal-slider-store";
import { computeGoalSliderResult, filterOfficialQuestions } from "@/lib/analytics/goal-slider-engine";
import { GoalTagBadge } from "@/components/ui/goal-tag-badge";

const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: {
    inlineMath: [["\\(", "\\)"]],
    displayMath: [["\\[", "\\]"]],
  },
};

// Fills the previously-empty right-hand space next to the (often short, 1-2 field)
// configuration form with a genuinely useful explanation of what each deployment
// type actually does, instead of leaving a wide blank void beside a narrow form.
const DEPLOYMENT_TYPE_INFO: Record<ExamType, { title: string; description: string }> = {
  YEAR_PAPER: {
    title: "Official Year Paper",
    description: "An unmodified replica of that year's real GATE paper — same questions, same marks distribution, same timing. Nothing is filtered or reordered, even if a Focus Target goal is active.",
  },
  SECTION_TEST: {
    title: "Section Sprint",
    description: "Every question from one exam section (e.g. General Aptitude), pulled from across all years. Good for a focused, shorter practice block on a single section.",
  },
  SUBJECT_TEST: {
    title: "Subject Mastery",
    description: "Every question tagged to one subject across all years and papers — the deepest single-subject practice pool available.",
  },
  TOPIC_TEST: {
    title: "Topic Spotlight",
    description: "Drills one specific topic within a subject. Best once Subject Mastery has surfaced a clear weak spot to isolate.",
  },
  CUSTOM_TEST: {
    title: "Custom Advanced Generator",
    description: "Full manual control over sections, subjects, difficulty mix, and question types — build an exact blueprint from scratch.",
  },
  GRAND_MOCK: {
    title: "Grand Mock",
    description: "A full-length simulated GATE paper blended across years — the closest thing to sitting the real exam.",
  },
};

export default function ExamSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkAppliedRef = useRef(false);
  const { isInitialized, totalQuestions } = useDataStore();
  const { createDraft, currentDraft } = useExamStore();
  const { targetPercent: goalTargetPercent, load: loadGoalSlider } = useGoalSliderStore();

  const [examType, setExamType] = useState<ExamType>("YEAR_PAPER");

  const [availablePapers, setAvailablePapers] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);

  const [selectedPaper, setSelectedPaper] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [maxAvailable, setMaxAvailable] = useState<number>(0);
  const [sourceType, setSourceType] = useState<"standard" | "ai_generated">("standard");

  // Live stats for the selected Official Year Paper — the Volume field only shows for
  // non-YEAR_PAPER modes, so this was the one deployment type with no feedback at all
  // about what "73 questions" actually meant until you'd already generated the blueprint.
  const paperPreviewStats = useMemo(() => {
    if (!isInitialized || examType !== "YEAR_PAPER" || !selectedPaper) return null;
    const questions = QuestionRepository.getPaper(selectedPaper);
    if (questions.length === 0) return null;
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    const estimatedMinutes = Math.round(questions.reduce((sum, q) => sum + (q.marks === 2 ? 216 : 108), 0) / 60);
    return { count: questions.length, totalMarks, estimatedMinutes };
  }, [isInitialized, examType, selectedPaper]);

  const [generationTimeMs, setGenerationTimeMs] = useState<number | null>(null);

  // AI-Generated Dashboard specific states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("ALL");
  const [filterTopic, setFilterTopic] = useState("ALL");
  const [filterDifficulty, setFilterDifficulty] = useState("ALL");
  const [selectedQIds, setSelectedQIds] = useState<Set<string>>(new Set());
  const [testName, setTestName] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedSetupQId, setExpandedSetupQId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Compute AI metrics dynamically
  const aiQuestionsList = useMemo(() => {
    if (!isInitialized) return [];
    return QuestionRepository.getAllQuestions().filter(q => (q as any).isAiGenerated === true);
  }, [isInitialized, totalQuestions]);

  const aiSubjects = useMemo(() => {
    return Array.from(new Set(aiQuestionsList.map(q => q.subject).filter(Boolean))).sort();
  }, [aiQuestionsList]);

  const aiTopics = useMemo(() => {
    const list = filterSubject && filterSubject !== "ALL"
      ? aiQuestionsList.filter(q => q.subject === filterSubject)
      : aiQuestionsList;
    return Array.from(new Set(list.map(q => q.topic).filter(Boolean))).sort();
  }, [aiQuestionsList, filterSubject]);

  useEffect(() => {
    loadGoalSlider();
  }, [loadGoalSlider]);

  // Topics currently prioritized by the app-wide Goal Slider (Topbar), so the Topic
  // Spotlight picker below can surface the same recommendation instead of a flat list.
  const isGoalSliderActive = goalTargetPercent < GOAL_SLIDER_DEFAULT_PERCENT;
  const goalSliderResult = useMemo(() => {
    if (!isInitialized || !isGoalSliderActive) return null;
    const officialQuestions = filterOfficialQuestions(QuestionRepository.getAllQuestions());
    return computeGoalSliderResult(officialQuestions, goalTargetPercent);
  }, [isInitialized, isGoalSliderActive, goalTargetPercent, totalQuestions]);

  const goalRecommendedTopics = useMemo(
    () => new Set((goalSliderResult?.includedTopics || []).map((t) => t.topic)),
    [goalSliderResult]
  );

  // Rank of each in-goal topic by importance (0 = most important) — used to order a
  // Focus-Target-scoped test's questions by priority within each difficulty tier.
  const goalTopicPriorityRank = useMemo(() => {
    const rank = new Map<string, number>();
    (goalSliderResult?.includedTopics || []).forEach((t, idx) => rank.set(t.topic, idx));
    return rank;
  }, [goalSliderResult]);

  // Compute dynamic grouped mapped layout tree
  const groupedAIQuestions = useMemo(() => {
    let list = [...aiQuestionsList];
    if (filterSubject && filterSubject !== "ALL") {
      list = list.filter(q => q.subject === filterSubject);
    }
    if (filterTopic && filterTopic !== "ALL") {
      list = list.filter(q => q.topic === filterTopic);
    }
    if (filterDifficulty && filterDifficulty !== "ALL") {
      list = list.filter(q => q.difficulty === filterDifficulty);
    }
    if (searchQuery.trim()) {
      const sQuery = searchQuery.toLowerCase();
      list = list.filter(q => 
        (q.questionTextRaw || "").toLowerCase().includes(sQuery) || 
        (q.topic || "").toLowerCase().includes(sQuery)
      );
    }

    // Group hierarchy: Section -> Subject -> Topic
    const sectionsMap = new Map<string, Map<string, Map<string, typeof aiQuestionsList>>>();
    for (const q of list) {
      const section = q.section || "AI Custom Practice";
      const subject = q.subject || "General Subject";
      const topic = q.topic || "General Topic";

      if (!sectionsMap.has(section)) {
        sectionsMap.set(section, new Map());
      }
      const subjectsMap = sectionsMap.get(section)!;

      if (!subjectsMap.has(subject)) {
        subjectsMap.set(subject, new Map());
      }
      const topicsMap = subjectsMap.get(subject)!;

      if (!topicsMap.has(topic)) {
        topicsMap.set(topic, []);
      }
      topicsMap.get(topic)!.push(q);
    }
    return sectionsMap;
  }, [aiQuestionsList, filterSubject, filterTopic, filterDifficulty, searchQuery]);

  // Helper selectors
  const toggleSelectQuestion = (qId: string) => {
    setSelectedQIds(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const toggleSelectTopic = (topicName: string, topicQsList: any[]) => {
    setSelectedQIds(prev => {
      const next = new Set(prev);
      const qIds = topicQsList.map(q => q.question_id);
      const allSelected = qIds.every(id => next.has(id));
      if (allSelected) {
        qIds.forEach(id => next.delete(id));
      } else {
        qIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectSubject = (subjectName: string, subjectQsList: any[]) => {
    setSelectedQIds(prev => {
      const next = new Set(prev);
      const qIds = subjectQsList.map(q => q.question_id);
      const allSelected = qIds.every(id => next.has(id));
      if (allSelected) {
        qIds.forEach(id => next.delete(id));
      } else {
        qIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectSection = (sectionName: string, sectionQsList: any[]) => {
    setSelectedQIds(prev => {
      const next = new Set(prev);
      const qIds = sectionQsList.map(q => q.question_id);
      const allSelected = qIds.every(id => next.has(id));
      if (allSelected) {
        qIds.forEach(id => next.delete(id));
      } else {
        qIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleStartAITest = async () => {
    if (selectedQIds.size === 0) return;
    const selectedQs = Array.from(selectedQIds)
      .map(id => QuestionRepository.getQuestionById(id))
      .filter(Boolean) as any[];

    const examQuestions = selectedQs.map((q, idx) => ({
      questionId: q.question_id,
      sequence: idx + 1
    }));

    const draft: ExamSessionDraft = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      config: {
        examType: "CUSTOM_TEST",
        isAiGenerated: true,
        questionCount: examQuestions.length,
      },
      questions: examQuestions,
      createdAt: new Date().toISOString()
    };

    // Keep useExamStore's currentDraft in sync too — this is a hand-built draft (an
    // explicit user-picked question list, which ExamBuilder's pool-selection can't express),
    // not one built via createDraft(), so anything still reading useExamStore().currentDraft
    // elsewhere doesn't see a stale/null draft for this session.
    useExamStore.getState().loadDraft(draft.id, draft);
    await useExamRuntimeStore.getState().startSession(draft);
    router.push("/exam/session");
  };

  useEffect(() => {
    if (isInitialized) {
      useDataStore.getState().refreshAIGeneratedQuestions();
    }
  }, [isInitialized, sourceType]);

  useEffect(() => {
    if (isInitialized) {
      const repo = QuestionRepository;
      const allQs = repo.getAllQuestions().filter(q => sourceType === "ai_generated" ? (q as any).isAiGenerated === true : !(q as any).isAiGenerated);

      const papers = Array.from(new Set(allQs.map(q => q.year_shift).filter(Boolean)));
      const subjects = Array.from(new Set(allQs.map(q => q.subject).filter(Boolean)));
      const topics = Array.from(new Set(allQs.map(q => q.topic).filter(Boolean)));
      const sections = Array.from(new Set(allQs.map(q => q.section).filter(Boolean)));

      setAvailablePapers(papers.sort());
      setAvailableSubjects(subjects.sort());
      setAvailableTopics(topics.sort());
      setAvailableSections(sections.sort());

      // Deep-link from Dashboard's Today's Focus cards (?subject=X or ?topic=Y) — applied
      // once, so it pre-selects the right dropdown instead of silently landing on a blank
      // Setup page. Only consumed on the very first load of this effect.
      const topicParam = !deepLinkAppliedRef.current ? searchParams.get("topic") : null;
      const subjectParam = !deepLinkAppliedRef.current ? searchParams.get("subject") : null;
      deepLinkAppliedRef.current = true;

      const topicOwnerSubject = topicParam ? allQs.find(q => q.topic === topicParam)?.subject : undefined;

      if (topicParam && topics.includes(topicParam)) {
        setExamType("TOPIC_TEST");
        setSelectedSubject(topicOwnerSubject && subjects.includes(topicOwnerSubject) ? topicOwnerSubject : (subjects[0] || ""));
        setSelectedTopic(topicParam);
      } else if (subjectParam && subjects.includes(subjectParam)) {
        setExamType("SUBJECT_TEST");
        setSelectedSubject(subjectParam);
        setSelectedTopic(topics.length > 0 ? topics[0] : "");
      } else {
        setSelectedSubject(subjects.length > 0 ? subjects[0] : "");
        setSelectedTopic(topics.length > 0 ? topics[0] : "");
      }

      setSelectedPaper(papers.length > 0 ? papers[0] : "");
      setSelectedSection(sections.length > 0 ? sections[0] : "");
    }
  }, [isInitialized, sourceType, totalQuestions, searchParams]);

  useEffect(() => {
    if (isInitialized && selectedSubject && (examType === "TOPIC_TEST" || examType === "SUBJECT_TEST")) {
      const repo = QuestionRepository;
      const allQs = repo.getSubjectBank(selectedSubject).filter(q => sourceType === "ai_generated" ? (q as any).isAiGenerated === true : !(q as any).isAiGenerated);
      const filteredTopics = Array.from(new Set(allQs.map(q => q.topic).filter(Boolean)));
      
      setAvailableTopics(filteredTopics.sort());
      if (filteredTopics.length > 0 && !filteredTopics.includes(selectedTopic)) setSelectedTopic(filteredTopics[0]);
    }
  }, [selectedSubject, isInitialized, examType, selectedTopic, sourceType]);

  useEffect(() => {
    if (isInitialized) {
      const repo = QuestionRepository;
      let count = 0;
      const focusFilterActive = isGoalSliderActive && sourceType === "standard" &&
        (examType === "SUBJECT_TEST" || examType === "SECTION_TEST" || examType === "CUSTOM_TEST");
      const applyFocusFilter = (qs: any[]) =>
        focusFilterActive ? qs.filter((q: any) => goalRecommendedTopics.has(q.topic)) : qs;

      if (examType === "SUBJECT_TEST" && selectedSubject) {
        count = applyFocusFilter(repo.getSubjectBank(selectedSubject).filter(q => sourceType === "ai_generated" ? (q as any).isAiGenerated === true : !(q as any).isAiGenerated)).length;
      } else if (examType === "TOPIC_TEST" && selectedTopic) {
        count = repo.getQuestionsByTopic(selectedTopic).filter(q => sourceType === "ai_generated" ? (q as any).isAiGenerated === true : !(q as any).isAiGenerated).length;
      } else if (examType === "SECTION_TEST" && selectedSection) {
        count = applyFocusFilter(repo.getQuestionsBySection(selectedSection).filter(q => sourceType === "ai_generated" ? (q as any).isAiGenerated === true : !(q as any).isAiGenerated)).length;
      }
      setMaxAvailable(count);
      // Default Volume to the full available pool whenever the scope changes (subject/topic/
      // section switch) — the student can still dial it down manually afterward.
      if (count > 0) {
        setQuestionCount(count);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examType, selectedSubject, selectedTopic, selectedSection, isInitialized, sourceType, isGoalSliderActive, goalRecommendedTopics]);

  // Easy -> Medium -> Hard, so a Focus-Target-scoped test warms up before getting harder.
  const DIFFICULTY_RANK: Record<string, number> = { Easy: 0, Moderate: 1, Medium: 1, Hard: 2 };

  const handleGenerate = () => {
    const config: TestConfig = {
      examType,
      isAiGenerated: sourceType === "ai_generated"
    };

    if (examType === "YEAR_PAPER") {
      config.yearShift = selectedPaper;
    } else if (examType === "SUBJECT_TEST") {
      config.subject = selectedSubject;
      config.questionCount = questionCount;
    } else if (examType === "TOPIC_TEST") {
      config.subject = selectedSubject;
      config.topics = [selectedTopic];
      config.questionCount = questionCount;
    } else if (examType === "SECTION_TEST") {
      config.section = selectedSection;
      config.questionCount = questionCount;
    } else if (examType === "CUSTOM_TEST") {
      config.questionCount = questionCount;
    }

    const start = performance.now();

    // When Focus Target is active, Subject/Section/Custom tests should actually respect it:
    // restrict the pool to in-goal topics and order questions easy -> medium -> hard (within
    // a tier, higher-priority topics first) instead of a random shuffle. Deliberately excluded:
    // YEAR_PAPER (must stay a true, unmodified replica of that year's real exam) and TOPIC_TEST
    // (the student already picked one specific topic — filtering by the goal set here could
    // wipe the pool out entirely if that topic isn't one of the in-goal ones).
    const applyFocusTarget = isGoalSliderActive && sourceType === "standard" &&
      (examType === "SUBJECT_TEST" || examType === "SECTION_TEST" || examType === "CUSTOM_TEST");

    if (applyFocusTarget) {
      let pool = examType === "SUBJECT_TEST"
        ? QuestionRepository.getSubjectBank(selectedSubject)
        : examType === "SECTION_TEST"
          ? QuestionRepository.getQuestionsBySection(selectedSection)
          : QuestionRepository.getAllQuestions();
      pool = pool.filter(q => !(q as any).isAiGenerated);
      pool = pool.filter(q => goalRecommendedTopics.has(q.topic));

      const sorted = [...pool].sort((a, b) => {
        const diffDelta = (DIFFICULTY_RANK[a.difficulty] ?? 1) - (DIFFICULTY_RANK[b.difficulty] ?? 1);
        if (diffDelta !== 0) return diffDelta;
        const rankA = goalTopicPriorityRank.get(a.topic) ?? 999;
        const rankB = goalTopicPriorityRank.get(b.topic) ?? 999;
        return rankA - rankB;
      });

      const finalCount = Math.min(questionCount, sorted.length);
      const selected = sorted.slice(0, finalCount);
      const draft: ExamSessionDraft = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        config: {
          ...config,
          questionCount: finalCount,
          topics: Array.from(new Set(selected.map(q => q.topic))),
          goalTag: goalSliderResult ? {
            targetPercent: goalTargetPercent,
            topicsCount: goalSliderResult.includedTopics.length,
            totalTopics: goalSliderResult.totalTopics,
            marksCaptured: goalSliderResult.marksCaptured,
          } : undefined,
        },
        questions: selected.map((q, idx) => ({ questionId: q.question_id, sequence: idx + 1 })),
        createdAt: new Date().toISOString(),
      };
      useExamStore.getState().loadDraft(draft.id, draft);
    } else {
      createDraft(config);
    }

    setGenerationTimeMs(performance.now() - start);
  };

  // Compute specific blueprint statistics from actual selected questions
  const draftStats = useMemo(() => {
    if (!currentDraft) return null;
    
    let totalMarks = 0;
    const diffs: Record<string, number> = { Easy: 0, Medium: 0, Hard: 0 };
    const types: Record<string, number> = { MCQ: 0, MSQ: 0, NAT: 0 };
    const sections = new Set<string>();
    const subjects = new Set<string>();
    const topics = new Set<string>();
    
    currentDraft.questions.forEach((q) => {
      const qData = QuestionRepository.getQuestionById(q.questionId);
      if (qData) {
        totalMarks += (qData.marks || 1);
        diffs[qData.difficulty || 'Medium'] = (diffs[qData.difficulty || 'Medium'] || 0) + 1;
        types[qData.question_type || 'MCQ'] = (types[qData.question_type || 'MCQ'] || 0) + 1;
        if (qData.section) sections.add(qData.section);
        if (qData.subject) subjects.add(qData.subject);
        if (qData.topic) topics.add(qData.topic);
      }
    });

    return {
      totalMarks,
      diffs,
      types,
      sections: sections.size,
      subjects: subjects.size,
      topics: topics.size,
      estimatedMinutes: Math.ceil(currentDraft.questions.length * 2.5) // ~2.5 mins per question avg
    };
  }, [currentDraft]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <ServerCog className="w-12 h-12 text-indigo-500 animate-spin-slow" />
          <div className="text-indigo-600 dark:text-indigo-400 font-bold tracking-widest uppercase">
            Initializing Engine
          </div>
        </div>
      </div>
    );
  }


  return (
    <MathJaxContext config={mathJaxConfig}>
    <div className="w-full flex justify-center pb-12">
      <div className="w-full flex flex-col gap-6">

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border)] pb-4"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
               <Settings className="w-6 h-6" />
            </div>
            <div>
               <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Configuration Engine</h1>
               <p className="text-sm font-medium text-[var(--text-secondary)]">Design your perfect test environment.</p>
            </div>
          </div>

          <div className="relative flex bg-[var(--surface-secondary)] border border-[var(--border-subtle)] p-1 rounded-xl shadow-sm">
            <button
              onClick={() => setSourceType("standard")}
              className={`relative z-10 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                sourceType === "standard"
                  ? "text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {sourceType === "standard" && (
                <motion.span
                  layoutId="setup-source-pill"
                  className="absolute inset-0 bg-indigo-600 rounded-lg shadow-sm -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              Standard GATE
            </button>
            <button
              onClick={() => setSourceType("ai_generated")}
              className={`relative z-10 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                sourceType === "ai_generated"
                  ? "text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {sourceType === "ai_generated" && (
                <motion.span
                  layoutId="setup-source-pill"
                  className="absolute inset-0 bg-indigo-600 rounded-lg shadow-sm -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Sparkles className="w-3.5 h-3.5" />
              AI Generated
            </button>
          </div>
        </motion.div>

        {sourceType === "ai_generated" ? (
          <div className="space-y-6">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1 flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    placeholder="Enter custom test name (e.g. AI Practice Session #1)"
                    className="px-4 py-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[var(--text-primary)] flex-1 min-w-[200px]"
                  />
                  
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by keyword or topic..."
                      className="pl-10 pr-4 py-3 w-full bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[var(--text-primary)]"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-3 w-5 h-5 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer bg-transparent border-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

              </div>

              <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Subject:</span>
                  <CustomDropdown
                    value={filterSubject}
                    onChange={(val) => {
                      setFilterSubject(val);
                      setFilterTopic("ALL");
                    }}
                    options={[{ label: "All Subjects", value: "ALL" }, ...aiSubjects.map(s => ({ label: s, value: s }))]}
                    className="w-40 text-xs font-bold"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Topic:</span>
                  <CustomDropdown
                    value={filterTopic}
                    onChange={setFilterTopic}
                    options={[{ label: "All Topics", value: "ALL" }, ...aiTopics.map(t => ({ label: t, value: t }))]}
                    className="w-44 text-xs font-bold"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Difficulty:</span>
                  <CustomDropdown
                    value={filterDifficulty}
                    onChange={setFilterDifficulty}
                    options={[
                      { label: "All Difficulties", value: "ALL" },
                      { label: "Easy", value: "Easy" },
                      { label: "Medium", value: "Medium" },
                      { label: "Hard", value: "Hard" }
                    ]}
                    className="w-40 text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {groupedAIQuestions.size === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-[var(--surface)] border border-[var(--border)] rounded-3xl text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base text-[var(--text-primary)]">No AI practice questions found</h3>
                  <p className="text-xs text-[var(--text-muted)] max-w-md font-semibold leading-relaxed">
                    {aiQuestionsList.length === 0 
                      ? 'Visit the AI Tutor workspace, select any question, click "Generate Set" to compile custom practice questions!'
                      : 'No generated questions match your active filter settings. Try relaxing your filters or search query!'}
                  </p>
                </div>
                <button
                  onClick={() => router.push("/ai-tutor")}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md"
                >
                  Go to AI Tutor Workspace
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {Array.from(groupedAIQuestions.entries()).map(([sectionName, subjectsMap], sectionIdx) => {
                  const sectionQs: any[] = [];
                  subjectsMap.forEach(topicsMap => {
                    topicsMap.forEach(qs => sectionQs.push(...qs));
                  });

                  const isAllSectionSelected = sectionQs.every(q => selectedQIds.has(q.question_id));
                  const isSomeSectionSelected = sectionQs.some(q => selectedQIds.has(q.question_id)) && !isAllSectionSelected;

                  return (
                    <motion.div
                      key={sectionName}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(sectionIdx * 0.06, 0.3) }}
                      className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4"
                    >
                      <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-3 bg-[var(--surface-secondary)]/10 px-3 py-2 rounded-xl">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleSelectSection(sectionName, sectionQs)}
                            className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition ${
                              isAllSectionSelected 
                                ? "bg-indigo-600 border-indigo-600 text-white" 
                                : isSomeSectionSelected 
                                  ? "bg-indigo-600/30 border-indigo-600 text-indigo-600" 
                                  : "border-[var(--border-strong)] hover:bg-[var(--surface-secondary)] bg-[var(--surface)]"
                            }`}
                          >
                            {isAllSectionSelected && <span className="text-[10px] font-black leading-none">✓</span>}
                            {isSomeSectionSelected && <span className="text-[10px] font-black leading-none">-</span>}
                          </button>
                          <h2 className="text-sm font-extrabold text-[var(--text-primary)] uppercase tracking-wider">{sectionName}</h2>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-black rounded-lg">
                          {sectionQs.length} Questions
                        </span>
                      </div>

                      <div className="space-y-4 pl-4 border-l border-[var(--border-subtle)]/60">
                        {Array.from(subjectsMap.entries()).map(([subjectName, topicsMap]) => {
                          const subjectQs: any[] = [];
                          topicsMap.forEach(qs => subjectQs.push(...qs));

                          const isAllSubjectSelected = subjectQs.every(q => selectedQIds.has(q.question_id));
                          const isSomeSubjectSelected = subjectQs.some(q => selectedQIds.has(q.question_id)) && !isAllSubjectSelected;

                          return (
                            <div key={subjectName} className="space-y-3">
                              <div className="flex justify-between items-center bg-[var(--surface-secondary)]/30 border border-[var(--border-subtle)]/40 p-3 rounded-xl">
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => toggleSelectSubject(subjectName, subjectQs)}
                                    className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition ${
                                      isAllSubjectSelected 
                                        ? "bg-indigo-600 border-indigo-600 text-white" 
                                        : isSomeSubjectSelected 
                                          ? "bg-indigo-600/30 border-indigo-600 text-indigo-600" 
                                          : "border-[var(--border-strong)] hover:bg-[var(--surface-secondary)] bg-[var(--surface)]"
                                    }`}
                                  >
                                    {isAllSubjectSelected && <span className="text-[10px] font-black leading-none">✓</span>}
                                    {isSomeSubjectSelected && <span className="text-[10px] font-black leading-none">-</span>}
                                  </button>
                                  <h3 className="text-xs font-extrabold text-[var(--text-primary)]">{subjectName}</h3>
                                </div>
                                <span className="text-[9px] px-2 py-0.5 bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-bold rounded">
                                  {subjectQs.length} Qs
                                </span>
                              </div>

                              <div className="space-y-3 pl-4 border-l border-[var(--border-subtle)]/40">
                                {Array.from(topicsMap.entries()).map(([topicName, questionsList]) => {
                                  const isAllTopicSelected = questionsList.every(q => selectedQIds.has(q.question_id));
                                  const isSomeTopicSelected = questionsList.some(q => selectedQIds.has(q.question_id)) && !isAllTopicSelected;
                                  const groupKey = `${sectionName}_${subjectName}_${topicName}`;
                                  const isGroupCollapsed = expandedGroups[groupKey] === false;

                                  return (
                                    <div key={topicName} className="border border-[var(--border-subtle)]/30 rounded-xl overflow-hidden">
                                      <div className="flex justify-between items-center bg-[var(--surface-secondary)]/10 p-2.5 border-b border-[var(--border-subtle)]/20">
                                        <div className="flex items-center gap-2.5">
                                          <button
                                            type="button"
                                            onClick={() => toggleSelectTopic(topicName, questionsList)}
                                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center cursor-pointer transition ${
                                              isAllTopicSelected 
                                                ? "bg-indigo-600 border-indigo-600 text-white" 
                                                : isSomeTopicSelected 
                                                  ? "bg-indigo-600/30 border-indigo-600 text-indigo-600" 
                                                  : "border-[var(--border-strong)] hover:bg-[var(--surface-secondary)] bg-[var(--surface)]"
                                            }`}
                                          >
                                            {isAllTopicSelected && <span className="text-[9px] font-black leading-none">✓</span>}
                                            {isSomeTopicSelected && <span className="text-[9px] font-black leading-none">-</span>}
                                          </button>
                                          <span className="text-[11px] font-bold text-[var(--text-secondary)]">{topicName}</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] text-[var(--text-muted)] font-bold">{questionsList.length} items</span>
                                          <button
                                            type="button"
                                            onClick={() => setExpandedGroups(prev => ({ ...prev, [groupKey]: !isGroupCollapsed }))}
                                            className="p-1 hover:bg-[var(--surface-secondary)] rounded cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                                          >
                                            {isGroupCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                                          </button>
                                        </div>
                                      </div>

                                      {!isGroupCollapsed && (
                                        <div className="divide-y divide-[var(--border-subtle)]/20">
                                          {questionsList.map((q) => {
                                            const isSelected = selectedQIds.has(q.question_id);
                                            const isQExpanded = expandedSetupQId === q.question_id;

                                            return (
                                              <div key={q.question_id} className="p-3 bg-[var(--surface)] hover:bg-[var(--surface-secondary)]/10 transition-colors">
                                                <div className="flex items-center justify-between gap-3">
                                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <button
                                                      type="button"
                                                      onClick={() => toggleSelectQuestion(q.question_id)}
                                                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center cursor-pointer transition ${
                                                        isSelected 
                                                          ? "bg-indigo-600 border-indigo-600 text-white" 
                                                          : "border-[var(--border-strong)] bg-[var(--surface)]"
                                                      }`}
                                                    >
                                                      {isSelected && <span className="text-[9px] font-black leading-none">✓</span>}
                                                    </button>
                                                    
                                                    <button
                                                      type="button"
                                                      onClick={() => setExpandedSetupQId(isQExpanded ? null : q.question_id)}
                                                      className="flex-1 text-left flex items-center justify-between min-w-0 group cursor-pointer"
                                                    >
                                                      <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                          <span className="text-[9px] font-black text-indigo-500 uppercase font-mono tracking-wider">Q{q.question_no}</span>
                                                          <span className="text-[9px] px-1.5 py-0.5 bg-[var(--surface-secondary)] text-[var(--text-muted)] font-black uppercase rounded-md">{q.question_type}</span>
                                                          <span className={`text-[9px] px-1.5 py-0.5 font-bold uppercase rounded-md ${
                                                            q.difficulty === "Hard" 
                                                              ? "bg-rose-500/10 text-rose-500" 
                                                              : q.difficulty === "Moderate" 
                                                                ? "bg-amber-500/10 text-amber-500" 
                                                                : "bg-emerald-500/10 text-emerald-500"
                                                          }`}>{q.difficulty}</span>
                                                          <span className="text-[9px] text-[var(--text-muted)] font-bold">{q.marks} Mark{q.marks !== 1 && "s"}</span>
                                                        </div>
                                                        <p className="text-xs font-semibold text-[var(--text-secondary)] mt-1 truncate leading-relaxed group-hover:text-[var(--text-primary)] transition-colors">
                                                          {q.questionTextRaw}
                                                        </p>
                                                      </div>
                                                      <span className="text-[var(--text-muted)] ml-2 shrink-0 group-hover:text-[var(--text-primary)] transition-colors">
                                                        {isQExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                      </span>
                                                    </button>
                                                  </div>
                                                </div>

                                                <AnimatePresence initial={false}>
                                                {isQExpanded && (
                                                  <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden"
                                                  >
                                                  <div className="mt-3.5 pl-6 border-l-2 border-indigo-500 space-y-4 text-xs font-medium text-[var(--text-secondary)]">
                                                    <div className="p-3.5 bg-[var(--surface-secondary)]/30 border border-[var(--border-subtle)] rounded-xl leading-relaxed whitespace-pre-wrap">
                                                      <AstNodeRenderer nodes={q.contentAst || []} />
                                                    </div>

                                                    {q.options && q.options.length > 0 && (
                                                      <div className="space-y-2">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] block">Option List</span>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                          {q.options.map((opt: any) => {
                                                            const isOptCorrect = !!opt.is_correct;
                                                            return (
                                                              <div 
                                                                key={opt.option_id}
                                                                className={`p-3 border rounded-xl flex items-start gap-2.5 ${
                                                                  isOptCorrect 
                                                                    ? "bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400 font-bold" 
                                                                    : "bg-[var(--surface-secondary)]/20 border-[var(--border-subtle)]/40 text-[var(--text-secondary)]"
                                                                }`}
                                                              >
                                                                <span className="font-extrabold shrink-0">{opt.option_id}.</span>
                                                                <div className="flex-1 overflow-hidden">
                                                                  <AstNodeRenderer nodes={opt.contentAst || []} />
                                                                </div>
                                                              </div>
                                                            );
                                                          })}
                                                        </div>
                                                      </div>
                                                    )}

                                                    {q.nat_answer_range && (
                                                      <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-xl text-green-700 dark:text-green-400 font-bold flex justify-between max-w-sm">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Correct Answer Range</span>
                                                        <span className="font-mono">{q.nat_answer_range.min} - {q.nat_answer_range.max}</span>
                                                      </div>
                                                    )}
                                                  </div>
                                                  </motion.div>
                                                )}
                                                </AnimatePresence>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Persistent floating action bar — keeps the selection count and Start Test
                action visible while scrolling through a long section/subject/topic list,
                instead of only living in the top toolbar where it scrolled out of view. */}
            {mounted && createPortal(
              <AnimatePresence>
                {selectedQIds.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 40 }}
                    transition={{ duration: 0.2 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-5 py-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl"
                  >
                    <div>
                      <span className="text-[9px] font-black uppercase text-[var(--text-muted)] block tracking-wide">Selected</span>
                      <span className="text-lg font-black text-indigo-500 font-mono leading-none">{selectedQIds.size}</span>
                    </div>
                    <button
                      onClick={() => setSelectedQIds(new Set())}
                      className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] rounded-lg transition cursor-pointer"
                    >
                      Clear
                    </button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleStartAITest}
                      className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Start Test</span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>,
              document.body
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col lg:flex-row gap-8">
            <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm p-6 md:p-8">
             <div className={examType === "CUSTOM_TEST" ? "" : "flex flex-col lg:flex-row gap-10"}>
              <div className="flex-1 min-w-0">
              <div className="mb-8 max-w-md">
                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                  Deployment Type
                </label>
                <CustomDropdown
                  value={examType}
                  onChange={(val) => setExamType(val as ExamType)}
                  options={[
                    { label: "Official Year Paper", value: "YEAR_PAPER" },
                    { label: "Section Sprint", value: "SECTION_TEST" },
                    { label: "Subject Mastery", value: "SUBJECT_TEST" },
                    { label: "Topic Spotlight", value: "TOPIC_TEST" },
                    { label: "Custom Advanced Generator", value: "CUSTOM_TEST" }
                  ]}
                  className="w-full text-sm font-medium"
                />
              </div>

              {examType === "CUSTOM_TEST" ? (
                <div className="mt-8 pt-8 border-t border-[var(--border-subtle)]">
                   <CustomTestBuilder onGenerate={(config) => {
                      const start = performance.now();
                      createDraft(config);
                      setGenerationTimeMs(performance.now() - start);
                   }} />
                </div>
              ) : (
                <div className="space-y-6">

                  {examType === "YEAR_PAPER" && (
                    <div className="max-w-md">
                      <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">Target Year & Shift</label>
                      <div className="relative">
                        <CustomDropdown
                          value={selectedPaper}
                          onChange={(v) => setSelectedPaper(v)}
                          options={availablePapers.map((p) => ({ label: p, value: p }))}
                        />
                      </div>
                    </div>
                  )}

                  {examType === "SECTION_TEST" && (
                    <div className="max-w-md">
                      <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">Target Section</label>
                      <div className="relative">
                        <CustomDropdown
                          value={selectedSection}
                          onChange={(v) => setSelectedSection(v)}
                          options={availableSections.map((s) => ({ label: s, value: s }))}
                        />
                      </div>
                    </div>
                  )}

                  {(examType === "SUBJECT_TEST" || examType === "TOPIC_TEST") && (
                    <div className="max-w-md">
                      <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">Target Subject</label>
                      <div className="relative">
                        <CustomDropdown
                          value={selectedSubject}
                          onChange={(v) => setSelectedSubject(v)}
                          options={availableSubjects.map((s) => ({ label: s, value: s }))}
                        />
                      </div>
                    </div>
                  )}

                  {examType === "TOPIC_TEST" && (
                    <div className="max-w-md mt-6">
                      <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                        Target Topic
                        {isGoalSliderActive && (
                          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                            <Target className="w-2.5 h-2.5" /> Focus Target: {goalTargetPercent}%
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <CustomDropdown
                          value={selectedTopic}
                          onChange={(v) => setSelectedTopic(v)}
                          options={[...availableTopics]
                            .sort((a, b) => {
                              const aRec = goalRecommendedTopics.has(a) ? 0 : 1;
                              const bRec = goalRecommendedTopics.has(b) ? 0 : 1;
                              return aRec - bRec || a.localeCompare(b);
                            })
                            .map((t) => ({
                              label: goalRecommendedTopics.has(t) ? `★ ${t}` : t,
                              value: t,
                            }))}
                        />
                      </div>
                      {isGoalSliderActive && (
                        <p className="text-[10px] text-[var(--text-muted)] font-semibold mt-1.5">
                          ★ starred topics are prioritized by your Focus Target goal (Topbar) — sorted first.
                        </p>
                      )}
                    </div>
                  )}

                  {examType !== "YEAR_PAPER" && (
                    <div className="max-w-md">
                      <label className="flex justify-between text-sm font-bold text-[var(--text-secondary)] mb-2">
                        <span>Volume (Questions)</span>
                        <span className="text-[var(--text-muted)] font-medium">Available: {maxAvailable}</span>
                      </label>
                      <input
                        type="number"
                        min="5"
                        max={maxAvailable > 0 ? maxAvailable : 100}
                        value={questionCount}
                        onChange={(e) => {
                          let val = parseInt(e.target.value) || 10;
                          if (maxAvailable > 0 && val > maxAvailable) val = maxAvailable;
                          setQuestionCount(val);
                        }}
                        className="w-full px-4 py-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  )}

                  <div className="pt-6">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleGenerate}
                      className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold tracking-wide shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer border-0"
                    >
                      <Target className="w-5 h-5 group-hover:scale-110 transition-transform" /> Generate Blueprint
                    </motion.button>
                  </div>
                </div>
              )}
              </div>

              {examType !== "CUSTOM_TEST" && (
                <div className="w-full lg:w-[260px] shrink-0 lg:border-l lg:border-[var(--border-subtle)] lg:pl-10">
                  <div className="p-4 bg-[var(--surface-secondary)]/60 rounded-2xl border border-[var(--border-subtle)] space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-indigo-500">
                      {DEPLOYMENT_TYPE_INFO[examType].title}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                      {DEPLOYMENT_TYPE_INFO[examType].description}
                    </p>

                    {examType === "YEAR_PAPER" && paperPreviewStats && (
                      <div className="pt-3 mt-1 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-2 text-center">
                        <div>
                          <div className="text-lg font-black text-[var(--text-primary)] font-mono">{paperPreviewStats.count}</div>
                          <div className="text-[9px] font-bold uppercase text-[var(--text-muted)] tracking-wide">Questions</div>
                        </div>
                        <div>
                          <div className="text-lg font-black text-[var(--text-primary)] font-mono">{paperPreviewStats.totalMarks}</div>
                          <div className="text-[9px] font-bold uppercase text-[var(--text-muted)] tracking-wide">Marks</div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-lg font-black text-[var(--text-primary)] font-mono">{paperPreviewStats.estimatedMinutes} min</div>
                          <div className="text-[9px] font-bold uppercase text-[var(--text-muted)] tracking-wide">Duration</div>
                        </div>
                      </div>
                    )}

                    {examType !== "YEAR_PAPER" && maxAvailable > 0 && (
                      <div className="pt-3 mt-1 border-t border-[var(--border-subtle)] text-center">
                        <div className="text-lg font-black text-[var(--text-primary)] font-mono">{maxAvailable}</div>
                        <div className="text-[9px] font-bold uppercase text-[var(--text-muted)] tracking-wide">Questions Available</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
             </div>
            </div>

            <div className="w-full lg:w-[420px] shrink-0">
               <motion.div
                 layout
                 className={`sticky top-24 bg-[var(--surface)] border ${currentDraft ? 'border-emerald-200 dark:border-emerald-900/50' : 'border-[var(--border)]'} rounded-3xl shadow-sm overflow-hidden transition-colors flex flex-col max-h-[calc(100vh-7rem)]`}
               >
                  <div className="flex items-center gap-3 p-6 pb-4 shrink-0">
                    <div className={`p-2 rounded-lg ${currentDraft ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'}`}>
                       <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg text-[var(--text-primary)]">Generated Blueprint</h3>
                    {currentDraft?.config?.goalTag && <GoalTagBadge tag={currentDraft.config.goalTag} />}
                  </div>

                  <AnimatePresence mode="wait">
                  {currentDraft && draftStats ? (
                    <motion.div
                      key="stats"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col min-h-0"
                    >
                      <div className="px-6 space-y-6 overflow-y-auto custom-scrollbar pb-2">

                      <div className="grid grid-cols-2 gap-3">
                         <div className="p-4 bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 rounded-2xl border border-indigo-500/20">
                            <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1 block">Questions</span>
                            <div className="text-3xl font-extrabold text-[var(--text-primary)]">{currentDraft.questions.length}</div>
                         </div>
                         <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-2xl border border-purple-500/20">
                            <span className="text-xs font-bold text-purple-500 uppercase tracking-widest mb-1 block">Marks</span>
                            <div className="text-3xl font-extrabold text-[var(--text-primary)]">{draftStats.totalMarks}</div>
                         </div>
                      </div>

                      <div className="space-y-3">
                         <div className="flex justify-between items-center text-sm border-b border-[var(--border-subtle)] pb-2">
                           <span className="font-medium text-[var(--text-secondary)]">Sections</span>
                           <span className="font-bold text-[var(--text-primary)]">{draftStats.sections}</span>
                         </div>
                         <div className="flex justify-between items-center text-sm border-b border-[var(--border-subtle)] pb-2">
                           <span className="font-medium text-[var(--text-secondary)]">Subjects</span>
                           <span className="font-bold text-[var(--text-primary)]">{draftStats.subjects}</span>
                         </div>
                         <div className="flex justify-between items-center text-sm border-b border-[var(--border-subtle)] pb-2">
                           <span className="font-medium text-[var(--text-secondary)]">Topics</span>
                           <span className="font-bold text-[var(--text-primary)]">{draftStats.topics}</span>
                         </div>
                         <div className="flex justify-between items-center text-sm pt-1">
                           <span className="font-medium text-[var(--text-secondary)]">Est. Duration</span>
                           <span className="font-bold text-[var(--text-primary)]">{draftStats.estimatedMinutes} mins</span>
                         </div>
                      </div>

                      <div>
                         <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Question Types</span>
                         <div className="flex gap-2">
                            <div className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                               <span className="text-[10px] font-black uppercase tracking-wider text-blue-500">MCQ</span>
                               <span className="text-sm font-extrabold text-[var(--text-primary)]">{draftStats.types['MCQ'] || 0}</span>
                            </div>
                            <div className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
                               <span className="text-[10px] font-black uppercase tracking-wider text-violet-500">MSQ</span>
                               <span className="text-sm font-extrabold text-[var(--text-primary)]">{draftStats.types['MSQ'] || 0}</span>
                            </div>
                            <div className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20">
                               <span className="text-[10px] font-black uppercase tracking-wider text-teal-500">NAT</span>
                               <span className="text-sm font-extrabold text-[var(--text-primary)]">{draftStats.types['NAT'] || 0}</span>
                            </div>
                         </div>
                      </div>

                      <div className="pb-2">
                         <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Difficulty Split</span>
                         <div className="flex h-3 rounded-full overflow-hidden w-full gap-0.5">
                            {['Hard', 'Medium', 'Easy'].map(d => {
                               const count = draftStats.diffs[d] || 0;
                               if(count===0) return null;
                               const percent = (count/currentDraft.questions.length)*100;
                               const color = d === 'Hard' ? 'bg-rose-500' : d === 'Medium' ? 'bg-amber-400' : 'bg-emerald-400';
                               return <div key={d} style={{width: `${percent}%`}} className={color} title={`${d}: ${count}`} />
                            })}
                         </div>
                         <div className="flex justify-between text-[10px] uppercase font-bold text-[var(--text-muted)] mt-2">
                            <span>{draftStats.diffs['Easy']||0} Easy</span>
                            <span>{draftStats.diffs['Medium']||0} Med</span>
                            <span>{draftStats.diffs['Hard']||0} Hard</span>
                         </div>
                      </div>
                      </div>

                      <div className="p-6 pt-4 shrink-0">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={async () => {
                          await useExamRuntimeStore.getState().startSession(currentDraft);
                          router.push("/exam/session");
                        }}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black tracking-wider uppercase shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
                      >
                        Deploy Session <Play className="w-5 h-5 fill-current" />
                      </motion.button>
                      </div>

                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-[var(--border)] rounded-2xl bg-[var(--surface-secondary)]/50 p-6 mx-6 mb-6"
                    >
                       <ServerCog className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
                       <h4 className="font-bold text-[var(--text-primary)] text-sm mb-1">Awaiting Configuration</h4>
                       <p className="text-xs font-medium text-[var(--text-muted)]">Set your parameters and hit Generate to compile the test.</p>
                    </motion.div>
                  )}
                  </AnimatePresence>
               </motion.div>
            </div>
          </div>
        )}

      </div>
    </div>
    </MathJaxContext>
  );
}
