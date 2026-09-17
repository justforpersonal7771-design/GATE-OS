"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, Moon, Sun, ClipboardList, Bookmark, RefreshCw, 
  PieChart, Calendar, Award, CornerDownLeft, Sparkles, Clock, Trash2
} from "lucide-react";
import { useStudyStore } from "@/store/use-study-store";
import { QuestionRepository } from "@/lib/repository/question-repository";
import { IDBManager } from "@/lib/repository/storage/idb-manager";

interface CommandItem {
  id: string;
  title: string;
  category: "Actions" | "Subjects" | "Topics" | "Questions" | "Bookmarks" | "Mistakes" | "Revision" | "Study Plans" | "Calendar Events";
  icon: any;
  action: () => void;
  badge?: string;
}

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { bookmarks, mistakes, loadStudyData } = useStudyStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load study details & history
  useEffect(() => {
    if (isOpen) {
      loadStudyData();
      const cached = localStorage.getItem("gateos_recent_searches");
      if (cached) {
        try {
          setRecentSearches(JSON.parse(cached));
        } catch {
          setRecentSearches([]);
        }
      }
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen, loadStudyData]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen, onClose]);

  // Add search term to history
  const addRecentSearch = useCallback((term: string) => {
    if (!term.trim()) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(p => p !== term);
      const updated = [term, ...filtered].slice(0, 5);
      localStorage.setItem("gateos_recent_searches", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem("gateos_recent_searches");
  }, []);

  // Define static actions/suggestions
  const staticActions = useMemo<CommandItem[]>(() => [
    {
      id: "action-dashboard",
      title: "Go to Dashboard",
      category: "Actions",
      icon: Sparkles,
      action: () => { router.push("/"); onClose(); }
    },
    {
      id: "action-diagnostics",
      title: "Start Diagnostics Exam",
      category: "Actions",
      icon: Award,
      action: () => { router.push("/setup"); onClose(); }
    },
    {
      id: "action-mistakes",
      title: "Review Mistakes Bank",
      category: "Actions",
      icon: ClipboardList,
      action: () => { router.push("/mistakes"); onClose(); }
    },
    {
      id: "action-bookmarks",
      title: "Open Bookmarks Manager",
      category: "Actions",
      icon: Bookmark,
      action: () => { router.push("/bookmarks"); onClose(); }
    },
    {
      id: "action-revision",
      title: "Start Revision Session",
      category: "Actions",
      icon: RefreshCw,
      action: () => { router.push("/revision"); onClose(); }
    },
    {
      id: "action-analytics",
      title: "Open Analytics Dashboard",
      category: "Actions",
      icon: PieChart,
      action: () => { router.push("/analytics"); onClose(); }
    },
    {
      id: "action-dark-mode",
      title: `Toggle ${resolvedTheme === "dark" ? "Light" : "Dark"} Mode`,
      category: "Actions",
      icon: resolvedTheme === "dark" ? Sun : Moon,
      action: () => { setTheme(resolvedTheme === "dark" ? "light" : "dark"); onClose(); }
    }
  ], [resolvedTheme, setTheme, router, onClose]);

  // Fuzzy regex match builder
  const buildFuzzyRegex = (searchStr: string) => {
    const chars = searchStr.split("");
    const regexStr = chars.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ".*").join("");
    return new RegExp(regexStr, "i");
  };

  // Compile list of searchable data
  const searchItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [...staticActions];

    if (!QuestionRepository.isReady()) return items;

    // Subjects
    const subjects = QuestionRepository.getUniqueSubjects();
    subjects.forEach((sub, idx) => {
      items.push({
        id: `subject-${idx}`,
        title: sub,
        category: "Subjects",
        icon: Award,
        action: () => { router.push(`/setup?subject=${encodeURIComponent(sub)}`); onClose(); }
      });
    });

    // Topics
    const topics = QuestionRepository.getUniqueTopics();
    topics.forEach((topic, idx) => {
      items.push({
        id: `topic-${idx}`,
        title: topic,
        category: "Topics",
        icon: Sparkles,
        action: () => { router.push(`/setup?topic=${encodeURIComponent(topic)}`); onClose(); }
      });
    });

    // Questions
    const questions = QuestionRepository.getAllQuestions();
    questions.slice(0, 65).forEach((q) => {
      items.push({
        id: `question-${q.question_id}`,
        title: `Question ${q.question_id.substring(0, 8)} (${q.question_type} - ${q.marks} Marks)`,
        category: "Questions",
        icon: ClipboardList,
        action: () => { router.push(`/setup?question=${q.question_id}`); onClose(); }
      });
    });

    // Bookmarks
    bookmarks.forEach((b) => {
      items.push({
        id: `bookmark-${b.questionId}`,
        title: `Bookmarked: ${b.subject} - ${b.topic}`,
        category: "Bookmarks",
        icon: Bookmark,
        action: () => { router.push("/bookmarks"); onClose(); }
      });
    });

    // Mistakes
    mistakes.forEach((m) => {
      items.push({
        id: `mistake-${m.questionId}`,
        title: `Mistake: ${m.subject} - ${m.topic}`,
        category: "Mistakes",
        icon: ClipboardList,
        action: () => { router.push("/mistakes"); onClose(); }
      });
    });

    return items;
  }, [staticActions, bookmarks, mistakes, router, onClose]);

  // Filter items based on query (fuzzy search)
  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      return staticActions.slice(0, 5); // Return top suggestions if empty
    }

    const regex = buildFuzzyRegex(query);
    return searchItems.filter(item => {
      return regex.test(item.title) || regex.test(item.category);
    }).slice(0, 10); // cap at 10 results for speed/performance
  }, [query, searchItems, staticActions]);

  // Key navigation handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          addRecentSearch(query);
          filteredItems[selectedIndex].action();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, query, addRecentSearch, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-start justify-center pt-[15vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          ref={containerRef}
          className="w-full max-w-xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[50vh] font-sans"
        >
          {/* Search Input Bar */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50">
            <Search className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search actions, topics, questions, bookmarks..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              className="w-full bg-transparent text-sm text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)]"
            />
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-1.5 font-mono text-[10px] font-bold text-[var(--text-muted)] shadow-sm">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {recentSearches.length > 0 && !query && (
              <div className="mb-2">
                <div className="px-3 py-1 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  <span>Recent Searches</span>
                  <button onClick={clearRecentSearches} className="hover:text-[var(--danger)] transition">Clear</button>
                </div>
                <div className="space-y-0.5 mt-1">
                  {recentSearches.map((term, i) => (
                    <button
                      key={term + i}
                      onClick={() => setQuery(term)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition text-left"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] px-3 py-1">
              {query ? "Matching Results" : "Suggested Actions"}
            </div>

            <div className="space-y-1 mt-1">
              {filteredItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      addRecentSearch(query);
                      item.action();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition text-left ${
                      isSelected 
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                        : "hover:bg-[var(--surface-secondary)] text-[var(--text-primary)]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isSelected ? "text-white" : "text-indigo-500"}`} />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold leading-tight">{item.title}</span>
                        <span className={`text-[9px] uppercase tracking-wider font-extrabold ${isSelected ? "text-indigo-200" : "text-[var(--text-muted)]"}`}>{item.category}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-indigo-100 font-mono">
                        <span>Select</span>
                        <CornerDownLeft className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}

              {filteredItems.length === 0 && (
                <div className="p-8 text-center text-xs text-[var(--text-muted)] font-semibold">
                  No matching results found for "{query}".
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
