"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Topbar } from "./topbar";
import { useDataStore } from "@/store/use-data-store";

import { useState } from "react";
import dynamic from "next/dynamic";

const CommandPalette = dynamic(
  () => import("../exam/command-palette").then(m => m.CommandPalette),
  { ssr: false }
);

const ToastContainer = dynamic(
  () => import("../ui/toast-container").then(m => m.ToastContainer),
  { ssr: false }
);

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const loadRepository = useDataStore((state) => state.loadRepository);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  
  useEffect(() => {
    loadRepository();
    // Register PWA Service Worker. This effect runs after hydration, by which point the
    // window's "load" event has typically already fired — a window.addEventListener("load",
    // ...) registered here would never receive it, meaning registration silently never ran
    // at all. Register directly instead; navigator.serviceWorker.register() is safe to call
    // any time.
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then((reg) => console.log("SW registered:", reg.scope))
        .catch((err) => console.warn("SW failed:", err));
    }
  }, [loadRepository]);

  // Global key listener for Ctrl+K command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  
  const isExamSession = pathname?.startsWith("/exam/session") || pathname?.startsWith("/revision/session") || pathname?.startsWith("/exam/results/review");

  if (isExamSession) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-background text-text-primary font-sans transition-colors selection:bg-accent/30 relative">
        <main className="w-full h-full overflow-hidden">
          {children}
        </main>
        <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-text-primary font-sans transition-colors selection:bg-accent/30 font-inter flex flex-col relative">
      <Topbar />
      <div className="flex-1 w-full overflow-hidden">
        <main className="w-full h-full overflow-y-auto p-4 sm:p-6 md:p-8 z-0 custom-scrollbar">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
      <ToastContainer />
    </div>
  );
}

