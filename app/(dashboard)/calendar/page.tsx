"use client";

import dynamic from "next/dynamic";
import { Calendar } from "lucide-react";

const StudyPlanner = dynamic(() => import("@/components/dashboard/study-planner").then(m => m.StudyPlanner), {
  ssr: false,
  loading: () => <div className="skeleton-shimmer h-[560px] rounded-3xl" />
});

export default function CalendarPage() {
  return (
    <div className="w-full mx-auto p-4 md:p-6 lg:p-8 space-y-6 bg-[var(--background)] min-h-screen">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Study Planner</h1>
          <p className="text-xs font-semibold text-[var(--text-secondary)]">Schedule revisions, mocks, and practice — quick-access from the Topbar too.</p>
        </div>
      </div>

      <StudyPlanner />
    </div>
  );
}
