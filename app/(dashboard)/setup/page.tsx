"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDataStore } from "@/store/use-data-store";
import { useExamStore } from "@/store/use-exam-store";
import { useExamRuntimeStore } from "@/store/use-exam-runtime-store";
import { QuestionRepository } from "@/lib/repository/question-repository";
import { ExamType, TestConfig } from "@/types/exam.types";
import { CustomTestBuilder } from "@/components/exam/custom-test-builder";
import { Settings, Play, ServerCog, Target, FileText, CheckCircle2 } from "lucide-react";
import { CustomDropdown } from "@/components/ui/custom-dropdown";

export default function ExamSetupPage() {
  const router = useRouter();
  const { isInitialized } = useDataStore();
  const { createDraft, currentDraft } = useExamStore();

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

  const [generationTimeMs, setGenerationTimeMs] = useState<number | null>(null);

  useEffect(() => {
    if (isInitialized) {
      const repo = QuestionRepository;
      const papers = repo.getAvailablePapers();
      const subjects = repo.getAvailableSubjects();
      const topics = repo.getAvailableTopics();
      const sections = repo.getAvailableSections();

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailablePapers(papers.sort());
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailableSubjects(subjects.sort());
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailableTopics(topics.sort());
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailableSections(sections.sort());

      if (papers.length > 0) setSelectedPaper(papers[0]);
      if (subjects.length > 0) setSelectedSubject(subjects[0]);
      if (topics.length > 0) setSelectedTopic(topics[0]);
      if (sections.length > 0) setSelectedSection(sections[0]);
    }
  }, [isInitialized]);

  useEffect(() => {
    if (isInitialized && selectedSubject && (examType === "TOPIC_TEST" || examType === "SUBJECT_TEST")) {
      const repo = QuestionRepository;
      const filteredTopics = repo.getAvailableTopics(selectedSubject);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailableTopics(filteredTopics.sort());
      if (filteredTopics.length > 0 && !filteredTopics.includes(selectedTopic)) setSelectedTopic(filteredTopics[0]);
    }
  }, [selectedSubject, isInitialized, examType, selectedTopic]);

  useEffect(() => {
    if (isInitialized) {
      const repo = QuestionRepository;
      let count = 0;
      if (examType === "SUBJECT_TEST" && selectedSubject) {
        count = repo.getSubjectBank(selectedSubject).length;
      } else if (examType === "TOPIC_TEST" && selectedTopic) {
        count = repo.getQuestionsByTopic(selectedTopic).length;
      } else if (examType === "SECTION_TEST" && selectedSection) {
        count = repo.getQuestionsBySection(selectedSection).length;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMaxAvailable(count);
      if (questionCount > count && count > 0) {
         // eslint-disable-next-line react-hooks/set-state-in-effect
         setQuestionCount(count);
      }
    }
  }, [examType, selectedSubject, selectedTopic, selectedSection, isInitialized, questionCount]);

  const handleGenerate = () => {
    const config: TestConfig = { examType };

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
    createDraft(config);
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
    <div className="w-full flex justify-center pb-12">
      <div className="w-full flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: Configuration */}
        <div className="flex-1 space-y-6">
          <div className="mb-6 flex items-center gap-4 border-b border-[var(--border)] pb-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
               <Settings className="w-6 h-6" />
            </div>
            <div>
               <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Configuration Engine</h1>
               <p className="text-sm font-medium text-[var(--text-secondary)]">Design your perfect test environment.</p>
            </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm p-6 md:p-8 shadow-sm">
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
                    <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">Target Topic</label>
                    <div className="relative">
                      <CustomDropdown
                        value={selectedTopic}
                        onChange={(v) => setSelectedTopic(v)}
                        options={availableTopics.map((t) => ({ label: t, value: t }))}
                      />
                    </div>
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
                  <button
                    onClick={handleGenerate}
                    className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold tracking-wide shadow-md transition-all flex items-center justify-center gap-2 group"
                  >
                    <Target className="w-5 h-5 group-hover:scale-110 transition-transform" /> Generate Blueprint
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Preview/Draft status */}
        <div className="w-full lg:w-[420px] shrink-0">
           <div className={`sticky top-24 bg-[var(--surface)] border ${currentDraft ? 'border-emerald-200 dark:border-emerald-900/50' : 'border-[var(--border)]'} rounded-3xl p-6 shadow-sm overflow-hidden transition-colors`}>
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-lg ${currentDraft ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'}`}>
                   <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-[var(--text-primary)]">Generated Blueprint</h3>
              </div>
              
              {currentDraft && draftStats ? (
                <div className="space-y-6">
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                     <div className="p-4 bg-[var(--surface-secondary)] rounded-2xl border border-[var(--border-subtle)]">
                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 block">Questions</span>
                        <div className="text-3xl font-extrabold text-[var(--text-primary)]">{currentDraft.questions.length}</div>
                     </div>
                     <div className="p-4 bg-[var(--surface-secondary)] rounded-2xl border border-[var(--border-subtle)]">
                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 block">Marks</span>
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
                     <div className="flex justify-between items-center text-sm border-b border-[var(--border-subtle)] pb-2">
                       <span className="font-medium text-[var(--text-secondary)]">Question Types</span>
                       <span className="font-bold text-[var(--text-primary)]">
                         MCQ: {draftStats.types['MCQ'] || 0} • MSQ: {draftStats.types['MSQ'] || 0} • NAT: {draftStats.types['NAT'] || 0}
                       </span>
                     </div>
                     <div className="flex justify-between items-center text-sm border-b border-[var(--border-subtle)] pb-2">
                       <span className="font-medium text-[var(--text-secondary)]">Est. Duration</span>
                       <span className="font-bold text-[var(--text-primary)]">{draftStats.estimatedMinutes} mins</span>
                     </div>
                     <div className="flex justify-between items-center text-sm pt-1">
                       <span className="font-medium text-[var(--text-secondary)]">Draft ID</span>
                       <span className="font-mono text-xs text-[var(--text-muted)] truncate max-w-[150px]">{currentDraft.id}</span>
                     </div>
                  </div>

                  {/* Difficulty Bar */}
                  <div className="pt-2">
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

                  <button
                    onClick={async () => {
                      await useExamRuntimeStore.getState().startSession(currentDraft);
                      router.push("/exam/session");
                    }}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black tracking-wider uppercase shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    Deploy Session <Play className="w-5 h-5 fill-current" />
                  </button>
                  
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-[var(--border)] rounded-2xl bg-[var(--surface-secondary)]\/50 p-6">
                   <ServerCog className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
                   <h4 className="font-bold text-[var(--text-primary)] text-sm mb-1">Awaiting Configuration</h4>
                   <p className="text-xs font-medium text-[var(--text-muted)]">Set your parameters and hit Generate to compile the test.</p>
                </div>
              )}
           </div>
        </div>

      </div>
    </div>
  );
}
