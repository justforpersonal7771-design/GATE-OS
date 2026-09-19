"use client";

import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStudyStore } from "@/store/use-study-store";
import { useDataStore } from "@/store/use-data-store";
import { QuestionRepository } from "@/lib/repository/question-repository";
import { AstNodeRenderer } from "@/components/exam/ast-node-renderer";
import { MathJaxContext } from "better-react-mathjax";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import {
  BookmarkMinus, Loader2, ChevronLeft, ChevronRight, StickyNote, Star,
  Tag, Folder, Plus, Calendar, Search, ArrowUpDown, Pin, Sparkles, Trash2, X, Target
} from "lucide-react";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import { PersonalNotesDrawer } from "@/components/ui/personal-notes-drawer";
import { FullscreenNavigation } from "@/components/ui/fullscreen-navigation";
import { IDBManager } from "@/lib/repository/storage/idb-manager";
import { useRouter } from "next/navigation";
import { AIResponseParser } from "@/lib/ai/ai-response-parser";

export default function BookmarksPage() {
  const router = useRouter();
  const { isInitialized } = useDataStore();
  const { bookmarks, loadStudyData, removeBookmark } = useStudyStore();
  
  const [activeBookmark, setActiveBookmark] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("ALL");
  const [selectedTag, setSelectedTag] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "priority" | "subject">("date");
  const [newFolderName, setNewFolderName] = useState("");
  const [isAddingFolder, setIsAddingFolder] = useState(false);

  // Metadata editor fields for active bookmark
  const [editFolderInput, setEditFolderInput] = useState("");
  const [editTagInput, setEditTagInput] = useState("");

  useEffect(() => {
    loadStudyData();
  }, [loadStudyData]);

  // Sync active bookmark selection on loading
  useEffect(() => {
    if (bookmarks.length > 0 && !activeBookmark) {
      setActiveBookmark(bookmarks[0].questionId);
    }
  }, [bookmarks, activeBookmark]);

  // Aggregate unique folders & tags across bookmarks
  const uniqueFolders = useMemo(() => {
    const foldersSet = new Set<string>(["Algorithms", "Revision", "Formula", "Interview", "Exam Day", "Quick Revision"]);
    bookmarks.forEach(b => {
      if (b.folders) b.folders.forEach(f => foldersSet.add(f));
    });
    return Array.from(foldersSet).sort();
  }, [bookmarks]);

  const uniqueTags = useMemo(() => {
    const tagsSet = new Set<string>();
    bookmarks.forEach(b => {
      if (b.tags) b.tags.forEach(t => tagsSet.add(t));
    });
    return Array.from(tagsSet).sort();
  }, [bookmarks]);

  // Update Bookmark metadata properties in local IndexedDB
  const handleUpdateBookmarkMeta = async (qid: string, updates: Partial<typeof bookmarks[0]>) => {
    const target = bookmarks.find(b => b.questionId === qid);
    if (!target) return;

    const updated = {
      ...target,
      ...updates
    };
    await IDBManager.saveBookmark(updated);
    await loadStudyData();
  };

  const handleAddFolderToActive = () => {
    if (!editFolderInput.trim() || !activeBookmark) return;
    const target = bookmarks.find(b => b.questionId === activeBookmark);
    if (!target) return;

    const currentFolders = target.folders || [];
    if (!currentFolders.includes(editFolderInput.trim())) {
      handleUpdateBookmarkMeta(activeBookmark, {
        folders: [...currentFolders, editFolderInput.trim()]
      });
    }
    setEditFolderInput("");
  };

  const handleAddTagToActive = () => {
    if (!editTagInput.trim() || !activeBookmark) return;
    const target = bookmarks.find(b => b.questionId === activeBookmark);
    if (!target) return;

    const currentTags = target.tags || [];
    if (!currentTags.includes(editTagInput.trim())) {
      handleUpdateBookmarkMeta(activeBookmark, {
        tags: [...currentTags, editTagInput.trim()]
      });
    }
    setEditTagInput("");
  };

  // Filtered and Sorted Bookmarks list
  const processedBookmarks = useMemo(() => {
    let result = [...bookmarks];

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.subject.toLowerCase().includes(q) || 
        b.topic.toLowerCase().includes(q) || 
        (b.notes || "").toLowerCase().includes(q)
      );
    }

    // 2. Folder filter
    if (selectedFolder !== "ALL") {
      result = result.filter(b => b.folders && b.folders.includes(selectedFolder));
    }

    // 3. Tag filter
    if (selectedTag !== "ALL") {
      result = result.filter(b => b.tags && b.tags.includes(selectedTag));
    }

    // 4. Priority filter
    if (selectedPriority !== "ALL") {
      result = result.filter(b => b.priority === selectedPriority);
    }

    // 5. Favorites filter
    if (showOnlyFavorites) {
      result = result.filter(b => b.favorite);
    }

    // 6. Sorting
    result.sort((a, b) => {
      if (sortBy === "subject") {
        return a.subject.localeCompare(b.subject);
      }
      if (sortBy === "priority") {
        const pWeight = { High: 3, Medium: 2, Low: 1 };
        const wA = pWeight[a.priority || "Medium"] || 2;
        const wB = pWeight[b.priority || "Medium"] || 2;
        return wB - wA; // highest priority first
      }
      // Default: date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [bookmarks, searchQuery, selectedFolder, selectedTag, selectedPriority, showOnlyFavorites, sortBy]);

  const activeEntry = activeBookmark ? bookmarks.find(b => b.questionId === activeBookmark) : null;
  const question = activeEntry ? QuestionRepository.getQuestionById(activeEntry.questionId) : null;

  const activeIndex = processedBookmarks.findIndex(b => b.questionId === activeBookmark);
  const handlePrev = activeIndex > 0 ? () => {
    setActiveBookmark(processedBookmarks[activeIndex - 1].questionId);
  } : undefined;
  
  const handleNext = activeIndex < processedBookmarks.length - 1 ? () => {
    setActiveBookmark(processedBookmarks[activeIndex + 1].questionId);
  } : undefined;

  // Dropdown options
  const sortOptions = [
    { label: "Sort: Date", value: "date" },
    { label: "Sort: Priority", value: "priority" },
    { label: "Sort: Subject", value: "subject" }
  ];

  const priorityOptions = [
    { label: "Low Priority", value: "Low" },
    { label: "Medium Priority", value: "Medium" },
    { label: "High Priority", value: "High" }
  ];

  if (!isInitialized) {
    return (
      <div className="p-12 flex justify-center h-full items-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <MathJaxContext config={{
      loader: { load: ["input/tex", "output/chtml"] },
      tex: {
        inlineMath: [["\\(", "\\)"]],
        displayMath: [["\\[", "\\]"]],
      },
    }}>
      <div className="w-full h-full flex flex-col md:flex-row gap-4 p-2 relative overflow-hidden bg-[var(--background)]">
        {/* Sidebar merged into a single continuous card */}
        <div className={`flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden transition-all duration-300 shrink-0 h-full ${isSidebarCollapsed ? "w-0 opacity-0 pointer-events-none" : "w-full md:w-80 opacity-100"}`}>
          
          {/* Header Title & Filter controls in same container */}
          <div className="p-4 shadow-sm space-y-3 shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/10">
            <div className="flex justify-between items-center">
              <h2 className="font-extrabold text-lg text-[var(--text-primary)]">Bookmarks</h2>
              <span className="text-xs px-2.5 py-1 bg-[var(--surface-secondary)] text-[var(--text-secondary)] font-bold rounded-lg border border-[var(--border-subtle)]">
                {processedBookmarks.length} Items
              </span>
            </div>

            {/* Global Search inside sidebar */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search bookmarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-2 pt-1">
              <button 
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition border ${
                  showOnlyFavorites 
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                    : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--surface-elevated)]"
                }`}
              >
                <Star className={`w-3 h-3 ${showOnlyFavorites ? "fill-amber-500 text-amber-500" : ""}`} />
                <span>Favorites</span>
              </button>

              <CustomDropdown
                value={sortBy}
                onChange={(val) => setSortBy(val as any)}
                options={sortOptions}
                className="text-xs flex-1 font-bold"
              />
            </div>
          </div>
          
          {/* Folders & List Section */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Folder select pills */}
            <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/30 flex gap-1 overflow-x-auto custom-scrollbar shrink-0">
              <button
                onClick={() => setSelectedFolder("ALL")}
                className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${
                  selectedFolder === "ALL" 
                    ? "bg-indigo-600 border-indigo-600 text-white" 
                    : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                }`}
              >
                All
              </button>
              {uniqueFolders.map(folder => (
                <button
                  key={folder}
                  onClick={() => setSelectedFolder(folder)}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border flex items-center gap-1 whitespace-nowrap ${
                    selectedFolder === folder 
                      ? "bg-indigo-600 border-indigo-600 text-white" 
                      : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                  }`}
                >
                  <Folder className="w-3 h-3" />
                  <span>{folder}</span>
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
              {processedBookmarks.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-secondary)] font-semibold text-xs leading-relaxed">
                   No bookmarks match.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {processedBookmarks.map((b, idx) => {
                    const isFav = b.favorite;
                    const isPinned = b.pinned;
                    const priorityColor = b.priority === "High" ? "bg-red-500" : b.priority === "Medium" ? "bg-amber-500" : "bg-blue-500";

                    return (
                      <motion.li
                        key={b.questionId}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(idx * 0.03, 0.4), duration: 0.2 }}
                      >
                        <button
                          onClick={() => {
                            setActiveBookmark(b.questionId);
                            handleUpdateBookmarkMeta(b.questionId, { recentlyViewedAt: new Date().toISOString() });
                          }}
                          className={`w-full text-left p-4 hover:bg-[var(--surface-elevated)] transition-all duration-200 relative ${activeBookmark === b.questionId ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-l-4 border-indigo-500' : 'border-l-4 border-transparent hover:border-indigo-500/30'}`}
                        >
                          <div className="flex justify-between items-start mb-1 gap-2">
                             <span className="font-bold text-[var(--text-primary)] text-xs line-clamp-1">{b.subject}</span>
                             <div className="flex items-center gap-1 shrink-0">
                               {isPinned && <Pin className="w-3 h-3 text-indigo-500 fill-indigo-500" />}
                               {isFav && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                               <span className={`w-1.5 h-1.5 rounded-full ${priorityColor}`} title={`${b.priority || 'Medium'} Priority`} />
                             </div>
                          </div>
                          <span className="text-[11px] text-[var(--text-secondary)] block line-clamp-1 mb-2 font-medium">{b.topic}</span>

                          {/* Render folders/tags inside lists */}
                          {((b.folders && b.folders.length > 0) || (b.tags && b.tags.length > 0) || b.sourceGoalTag) && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {b.sourceGoalTag && (
                                <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <Target className="w-2.5 h-2.5" />
                                  {b.sourceGoalTag.targetPercent}%
                                </span>
                              )}
                              {(b.folders || []).map(f => (
                                <span key={f} className="text-[9px] font-black uppercase tracking-wider bg-[var(--surface-secondary)] text-[var(--text-muted)] border border-[var(--border-subtle)] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <Folder className="w-2.5 h-2.5" />
                                  {f}
                                </span>
                              ))}
                              {(b.tags || []).map(t => (
                                <span key={t} className="text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 px-1.5 py-0.5 rounded">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Collapse Handle Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`hidden md:flex items-center justify-center w-6 h-12 my-auto bg-[var(--surface)] hover:bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] z-20 transition shadow-sm cursor-pointer shrink-0 ${
            isSidebarCollapsed ? "ml-0 rounded-r-lg border-l-0" : "-ml-3 rounded-full"
          }`}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        
        {/* Main Content Area */}
        <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm flex flex-col h-full overflow-hidden min-w-0">
          {activeBookmark && question && activeEntry ? (
            <>
              <div className="p-4 md:p-6 border-b border-[var(--border-subtle)] flex flex-wrap justify-between items-center bg-[var(--surface-secondary)] dark:bg-[var(--surface-secondary)] gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="md:hidden p-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                    title="Toggle Sidebar"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
                  </button>
                  <div>
                     <h3 className="font-extrabold text-[var(--text-primary)] text-sm tracking-tight">Question Review</h3>
                     <span className="text-[11px] text-[var(--text-muted)] font-semibold">{question.subject} • {question.topic}</span>
                  </div>
                </div>

                {/* Bookmark Metadata Editors & Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Star Toggle */}
                  <button
                    onClick={() => handleUpdateBookmarkMeta(activeBookmark, { favorite: !activeEntry.favorite })}
                    className={`p-2 border rounded-lg transition cursor-pointer hover:bg-[var(--surface-secondary)] hover:border-[var(--border-strong)] ${
                      activeEntry.favorite 
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20" 
                        : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-amber-500"
                    }`}
                    title={activeEntry.favorite ? "Unfavorite" : "Favorite"}
                  >
                    <Star className={`w-4 h-4 ${activeEntry.favorite ? "fill-amber-500 text-amber-500" : ""}`} />
                  </button>

                  {/* Pin Toggle */}
                  <button
                    onClick={() => handleUpdateBookmarkMeta(activeBookmark, { pinned: !activeEntry.pinned })}
                    className={`p-2 border rounded-lg transition cursor-pointer hover:bg-[var(--surface-secondary)] hover:border-[var(--border-strong)] ${
                      activeEntry.pinned 
                        ? "bg-indigo-600/10 border-indigo-600/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/20" 
                        : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-indigo-500"
                    }`}
                    title={activeEntry.pinned ? "Unpin" : "Pin"}
                  >
                    <Pin className={`w-4 h-4 ${activeEntry.pinned ? "fill-indigo-500 text-indigo-500" : ""}`} />
                  </button>

                  {/* Modern Priority selector custom dropdown */}
                  <CustomDropdown
                    value={activeEntry.priority || "Medium"}
                    onChange={(val) => handleUpdateBookmarkMeta(activeBookmark, { priority: val as any })}
                    options={priorityOptions}
                    className="text-xs w-36 font-bold"
                  />

                  <button
                    onClick={() => router.push(`/ai-tutor?qid=${activeBookmark}`)}
                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition cursor-pointer flex items-center justify-center shrink-0"
                    title="Explain with AI Tutor"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      const nextVal = !isNotesOpen;
                      setIsNotesOpen(nextVal);
                      if (nextVal) {
                        setIsSidebarCollapsed(true);
                      }
                    }}
                    className={`relative p-2 border rounded-lg transition cursor-pointer flex items-center justify-center shrink-0 ${
                      isNotesOpen
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20"
                        : "bg-[var(--surface-elevated)] hover:bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                    }`}
                    title="Personal Notes"
                  >
                    <StickyNote className="w-4 h-4 text-amber-500" />
                    {activeEntry.notes && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-[var(--surface)] animate-pulse" />
                    )}
                  </button>

                  <button
                    onClick={async () => {
                      if (confirm("Remove this bookmark?")) {
                        await removeBookmark(activeBookmark);
                        setActiveBookmark(null);
                      }
                    }}
                    className="p-2 border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-lg transition cursor-pointer flex items-center justify-center shrink-0"
                    title="Remove Bookmark"
                  >
                    <BookmarkMinus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tag/Folder manager bar */}
              <div className="bg-[var(--surface-secondary)]/50 border-b border-[var(--border-subtle)] px-6 py-3 flex flex-wrap gap-4 items-center justify-between">
                {/* Current folders list & insertion form */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1 mr-1">
                    <Folder className="w-3.5 h-3.5 text-indigo-500" />
                    Folders:
                  </span>
                  {(activeEntry.folders || []).map(folder => (
                    <span key={folder} className="text-[10px] font-bold bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-md flex items-center gap-1">
                      <span>{folder}</span>
                      <button 
                        onClick={() => handleUpdateBookmarkMeta(activeBookmark, { folders: (activeEntry.folders || []).filter(f => f !== folder) })}
                        className="hover:text-red-500 font-bold ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1 ml-2">
                    <input 
                      type="text" 
                      placeholder="Add folder..."
                      value={editFolderInput}
                      onChange={(e) => setEditFolderInput(e.target.value)}
                      className="border border-[var(--border-subtle)] px-2 py-0.5 rounded bg-[var(--surface)] text-[10px] focus:outline-none focus:border-indigo-500 w-24"
                      onKeyDown={(e) => e.key === "Enter" && handleAddFolderToActive()}
                    />
                    <button onClick={handleAddFolderToActive} className="p-1 hover:bg-[var(--surface-elevated)] rounded border border-[var(--border-subtle)]">
                      <Plus className="w-3 h-3 text-[var(--text-secondary)]" />
                    </button>
                  </div>
                </div>

                {/* Current tags list & insertion form */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1 mr-1">
                    <Tag className="w-3.5 h-3.5 text-indigo-500" />
                    Tags:
                  </span>
                  {(activeEntry.tags || []).map(tag => (
                    <span key={tag} className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <span>#{tag}</span>
                      <button 
                        onClick={() => handleUpdateBookmarkMeta(activeBookmark, { tags: (activeEntry.tags || []).filter(t => t !== tag) })}
                        className="hover:text-red-500 font-bold ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1 ml-2">
                    <input 
                      type="text" 
                      placeholder="Add tag..."
                      value={editTagInput}
                      onChange={(e) => setEditTagInput(e.target.value)}
                      className="border border-[var(--border-subtle)] px-2 py-0.5 rounded bg-[var(--surface)] text-[10px] focus:outline-none focus:border-indigo-500 w-20"
                      onKeyDown={(e) => e.key === "Enter" && handleAddTagToActive()}
                    />
                    <button onClick={handleAddTagToActive} className="p-1 hover:bg-[var(--surface-elevated)] rounded border border-[var(--border-subtle)]">
                      <Plus className="w-3 h-3 text-[var(--text-secondary)]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Question container */}
              <div id="bookmark-workspace-container" className="flex-1 flex flex-col min-h-0 bg-[var(--surface)] relative">
                <div className="absolute top-4 right-4 z-50">
                  <FullscreenToggle targetId="bookmark-workspace-container" />
                </div>
                <FullscreenNavigation
                  onPrev={handlePrev}
                  onNext={handleNext}
                  isPrevDisabled={activeIndex === 0}
                  isNextDisabled={activeIndex === processedBookmarks.length - 1}
                />
                
                {/* Question Scrollable Area */}
                <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-12 custom-scrollbar pt-12 sm:pt-14">
                  <div className="text-lg md:text-xl font-medium leading-relaxed text-[var(--text-primary)] mb-8">
                     <AstNodeRenderer nodes={question.contentAst} />
                  </div>

                  {/* AI Tutor Insights integration */}
                  {(activeEntry.aiShortcut || activeEntry.personalObservations) && (
                    <div className="mt-8 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        AI Tutor Saved Insights
                      </h4>
                      {activeEntry.aiShortcut && (
                        <div>
                          <span className="text-[10px] font-black uppercase text-[var(--text-muted)] block mb-0.5">Saved Shortcut Trick</span>
                          <div className="text-xs font-semibold text-[var(--text-secondary)] leading-relaxed">
                            <AstNodeRenderer nodes={AIResponseParser.parse(activeEntry.aiShortcut)} />
                          </div>
                        </div>
                      )}
                      {activeEntry.personalObservations && (
                        <div>
                          <span className="text-[10px] font-black uppercase text-[var(--text-muted)] block mb-0.5">Personal Observations</span>
                          <div className="text-xs font-semibold text-[var(--text-secondary)] leading-relaxed">
                            <AstNodeRenderer nodes={AIResponseParser.parse(activeEntry.personalObservations)} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Options Fixed Area */}
                <div className="flex-none p-4 sm:p-6 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)] shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.02)] z-10 w-full">
                  <div className="w-full">
                    {(question.question_type === "MCQ" || question.question_type === "MSQ") && (
                       <div className={`grid gap-3 ${question.options.some(opt => opt.contentAst.some(n => n.type === 'image')) ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
                         {question.options.map(o => {
                            const isActuallyCorrect = o.is_correct;
                            const isUserSelected = (activeEntry.selectedOptions || []).includes(o.option_id);
                            let borderClass = "border-[var(--border)] bg-[var(--surface)]";
                            
                            if (isActuallyCorrect && isUserSelected) borderClass = "border-green-500 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500";
                            else if (isActuallyCorrect && !isUserSelected) borderClass = "border-green-500 bg-[var(--surface)] ring-2 ring-green-500 border-transparent border-dashed text-green-700 dark:text-green-500";
                            else if (!isActuallyCorrect && isUserSelected) borderClass = "border-red-500 bg-red-50 dark:bg-red-900/20 ring-1 ring-red-500 text-red-700 dark:text-red-500";

                            return (
                              <div key={o.option_id} className={`p-4 border-[2px] rounded-xl ${borderClass} overflow-hidden`}>
                                <div className="flex items-start gap-3 w-full">
                                   <div className="shrink-0 font-black text-inherit w-5 mt-0.5">{o.option_id}.</div>
                                   <div className="text-[var(--text-primary)] max-w-full overflow-hidden break-words"><AstNodeRenderer nodes={o.contentAst} /></div>
                                 </div>
                              </div>
                            );
                          })}
                       </div>
                    )}

                    {question.question_type === "NAT" && (
                      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-2xl w-full">
                        <div className="flex-1 flex justify-between items-center bg-[var(--surface)] p-3 border border-[var(--border-subtle)] rounded-xl">
                          <span className="text-[10px] font-black text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-widest">Correct Answer Range</span>
                          <span className="font-mono font-bold text-green-600 dark:text-green-400">
                            {question.nat_answer_range?.min} {question.nat_answer_range?.min !== question.nat_answer_range?.max && `- ${question.nat_answer_range?.max}`}
                          </span>
                        </div>
                        {activeEntry.natValue && (
                          <div className={`flex-1 flex justify-between items-center bg-[var(--surface)] p-3 border rounded-xl ${
                            parseFloat(activeEntry.natValue) >= (question.nat_answer_range?.min || 0) &&
                            parseFloat(activeEntry.natValue) <= (question.nat_answer_range?.max || 0)
                              ? 'border-green-500 text-green-700 dark:text-green-500'
                              : 'border-red-500 text-red-700 dark:text-red-500'
                          }`}>
                            <span className="text-[10px] font-black text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-widest">Your Answer</span>
                            <span className="font-mono font-bold">{activeEntry.natValue}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-[var(--text-secondary)]"
            >
               <BookmarkMinus className="w-12 h-12 text-[var(--text-muted)] mb-4" />
               <h3 className="font-bold text-lg text-[var(--text-primary)] mb-1">No bookmark selected</h3>
               <p className="text-sm text-[var(--text-muted)] text-center max-w-sm">Select a bookmarked question from the sidebar to review detailed answers and add notes.</p>
            </motion.div>
          )}
        </div>

        {/* Inline Curved Notes Panel */}
        <AnimatePresence>
        {isNotesOpen && activeBookmark && activeEntry && (
          <motion.div
            initial={{ opacity: 0, x: 24, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 320 }}
            exit={{ opacity: 0, x: 24, width: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 32 }}
            className="h-full flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm shrink-0 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--surface-secondary)]">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-wider text-xs">
                <StickyNote className="w-4 h-4" />
                <span>Personal Notes</span>
              </div>
              <button
                onClick={() => setIsNotesOpen(false)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 flex flex-col gap-3">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-extrabold">
                Add formulas, shortcuts, hints, or personal notes to this question.
              </p>
              <textarea
                value={activeEntry.notes || ""}
                onChange={async (e) => {
                  const notes = e.target.value;
                  const { updateBookmarkNotes } = useStudyStore.getState();
                  await updateBookmarkNotes(activeBookmark, notes);
                }}
                placeholder="Write your note here... (Changes are saved automatically)"
                className="w-full flex-1 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]/50 text-[var(--text-primary)] focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none text-xs font-semibold leading-relaxed"
              />
            </div>

            {/* Footer */}
            <button
              onClick={() => setIsNotesOpen(false)}
              className="p-4 border-t border-[var(--border-subtle)] text-center bg-[var(--surface-secondary)] hover:bg-[var(--surface-elevated)] transition-colors text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-black uppercase tracking-wider cursor-pointer w-full"
            >
              Save & Close Note
            </button>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </MathJaxContext>
  );
}
