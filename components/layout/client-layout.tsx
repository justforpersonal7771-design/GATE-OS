"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Topbar } from "./topbar";
import { useDataStore } from "@/store/use-data-store";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const loadRepository = useDataStore((state) => state.loadRepository);
  
  useEffect(() => {
    loadRepository();
  }, [loadRepository]);
  
  const isExamSession = pathname?.startsWith("/exam/session") || pathname?.startsWith("/revision/session") || pathname?.startsWith("/exam/results/review");

  if (isExamSession) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-background text-text-primary font-sans transition-colors selection:bg-accent/30">
        <main className="w-full h-full overflow-hidden">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-text-primary font-sans transition-colors selection:bg-accent/30 font-inter flex flex-col">
      <Topbar />
      <div className="flex-1 w-full overflow-hidden">
        <main className="w-full h-full overflow-y-auto p-4 sm:p-6 md:p-8 z-0 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}

