"use client";

import { useEffect, useState, useMemo } from "react";
import { useStudyStore } from "@/store/use-study-store";
import { useAnalyticsStore } from "@/store/use-analytics-store";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";

export default function RevisionBuilderPage() {
  const router = useRouter();
  const { mistakes, bookmarks, loadStudyData } = useStudyStore();
  const { dashboardMetrics, refreshAnalytics } = useAnalyticsStore();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"mistakes" | "bookmarks" | "weak_topics">("mistakes");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    loadStudyData();
    refreshAnalytics();
  }, [loadStudyData, refreshAnalytics]);

  const weakTopics = useMemo(() => {
    if (!dashboardMetrics) return [];
    return dashboardMetrics.topicPerformance.filter(t => {
      const acc = t.attempted > 0 ? (t.correct / t.attempted) * 100 : 0;
      return t.attempted >= 3 && acc < 50;
    });
  }, [dashboardMetrics]);

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const handleStartRevision = () => {
    router.push(`/revision/session?mode=${mode}`);
  };

  return (
    <div className="w-full mx-auto p-4 md:p-8">
       <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-2">Revision Engine</h1>
       <p className="text-[var(--text-secondary)] mb-8">Generate custom revision sessions focused on your weak areas and saved questions.</p>

       <div className="space-y-4">
         <div 
           className={`border-2 rounded-xl p-5 cursor-pointer transition-all ${mode === "mistakes" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-[var(--border)] bg-[var(--surface)] hover:border-indigo-300"}`}
           onClick={() => setMode("mistakes")}
         >
            <div className="flex justify-between items-start">
               <div>
                 <h3 className="font-bold text-lg text-[var(--text-primary)]">Mistakes Bank</h3>
                 <p className="text-[var(--text-muted)] mt-1 text-sm">Review questions you answered incorrectly or marked for review.</p>
               </div>
               <span className="bg-[var(--surface)] px-3 py-1 rounded-full text-indigo-700 dark:text-indigo-400 font-bold shadow-sm">{mistakes.filter(m => !m.mastered).length} Pending</span>
            </div>
         </div>

         <div 
           className={`border-2 rounded-xl p-5 cursor-pointer transition-all ${mode === "bookmarks" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-[var(--border)] bg-[var(--surface)] hover:border-indigo-300"}`}
           onClick={() => setMode("bookmarks")}
         >
            <div className="flex justify-between items-start">
               <div>
                 <h3 className="font-bold text-lg text-[var(--text-primary)]">Bookmarks</h3>
                 <p className="text-[var(--text-muted)] mt-1 text-sm">Revise questions you have manually bookmarked with your personal notes.</p>
               </div>
               <span className="bg-[var(--surface)] px-3 py-1 rounded-full text-indigo-700 dark:text-indigo-400 font-bold shadow-sm">{bookmarks.length} Saved</span>
            </div>
         </div>

         <div 
           className={`border-2 rounded-xl p-5 cursor-pointer transition-all ${mode === "weak_topics" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-[var(--border)] bg-[var(--surface)] hover:border-indigo-300"}`}
           onClick={() => setMode("weak_topics")}
         >
            <div className="flex justify-between items-start">
               <div>
                 <h3 className="font-bold text-lg text-[var(--text-primary)]">Weak Topics</h3>
                 <p className="text-[var(--text-muted)] mt-1 text-sm">Dynamically generate a session from topics where your accuracy is below 50%.</p>
               </div>
               <span className="bg-[var(--surface)] px-3 py-1 rounded-full text-indigo-700 dark:text-indigo-400 font-bold shadow-sm">{weakTopics.length} Topics</span>
            </div>
         </div>
       </div>

       <div className="mt-8 pt-6 border-t border-[var(--border)] flex justify-end">
          <button
            onClick={handleStartRevision}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-sm transition"
          >
            <RefreshCw className="w-5 h-5" /> Start Revision
          </button>
       </div>
    </div>
  );
}
