import { motion, AnimatePresence } from "motion/react";

// ... keep icons and other imports
import { useDataStore } from "@/store/use-data-store";
import { Moon, Sun, Cloud, Database, LayoutDashboard, Settings, BookOpen, PieChart, ClipboardList, Bookmark, RefreshCw, Menu, X, ShieldAlert, BrainCircuit, Calendar as CalendarIcon, ListTodo, Target } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarQuickPanel } from "./calendar-quick-panel";
import { TodoQuickPanel } from "./todo-quick-panel";
import { GoalSliderPanel } from "./goal-slider-panel";
import { useToastStore } from "@/store/use-toast-store";
import { useGoalSliderStore, GOAL_SLIDER_DEFAULT_PERCENT } from "@/store/use-goal-slider-store";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Exam Setup", href: "/setup", icon: Settings },
  { label: "AI Mentor", href: "/ai-mentor", icon: BrainCircuit },
  { label: "Mistakes", href: "/mistakes", icon: ClipboardList },
  { label: "Bookmarks", href: "/bookmarks", icon: Bookmark },
  { label: "Revision", href: "/revision", icon: RefreshCw },
  { label: "Analytics", href: "/analytics", icon: PieChart },
];

export function Topbar() {
  const { diagnostics, isInitialized } = useDataStore();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const pathname = usePathname();

  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"ready" | "syncing">("ready");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [isTodoOpen, setIsTodoOpen] = useState(false);
  const todoRef = useRef<HTMLDivElement>(null);
  const [isGoalSliderOpen, setIsGoalSliderOpen] = useState(false);
  const { targetPercent, load: loadGoalSlider } = useGoalSliderStore();

  useEffect(() => {
    loadGoalSlider();
  }, [loadGoalSlider]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => {
        setIsOnline(true);
        setSyncStatus("syncing");
        setTimeout(() => setSyncStatus("ready"), 1500); // mock synchronization complete
      };
      const handleOffline = () => setIsOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    if (!isCalendarOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCalendarOpen]);

  useEffect(() => {
    if (!isTodoOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (todoRef.current && !todoRef.current.contains(event.target as Node)) {
        setIsTodoOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isTodoOpen]);

  const toggleTheme = () => {
    if (!mounted) return;
    setTheme(resolvedTheme === "light" ? "dark" : "light");
  };

  const handleDeveloperReset = async () => {
    if (!confirm("Are you sure you want to hard reset the app? This will clear all data, caches, and unregister service workers.")) return;
    
    setIsResetting(true);
    try {
      indexedDB.deleteDatabase("GatePrepOS_DB");
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
      window.location.reload();
    } catch (e) {
      console.error("Reset failed", e);
      setIsResetting(false);
      useToastStore.getState().show("Reset failed: " + e, "error");
    }
  };

  return (
    <>
    <header className="h-16 relative bg-[var(--background)]/85 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
      <div className="w-full h-full px-4 sm:px-6 md:px-8 flex items-center justify-between">

        {/* Logo and Desktop Nav */}
        <div className="flex items-center gap-8 h-full">
          <Link href="/" className="font-black text-xl text-[var(--text-primary)] shrink-0 flex items-center gap-2.5 group">
             <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center transition-transform group-hover:scale-105 group-hover:rotate-3 shadow-lg shadow-indigo-600/30">
                G
             </div>
             <span className="hidden sm:inline">GATE OS</span>
          </Link>

          <nav className="hidden lg:flex items-center h-full gap-1 relative">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-sm transition-colors z-10 ${
                    isActive
                      ? "text-white"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="topbar-active-pill"
                      className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg -z-10 shadow-md shadow-indigo-600/25"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Connection sync status indicators */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--surface-secondary)] text-[var(--text-secondary)] transition-colors shadow-sm border border-[var(--border-subtle)]">
            {isOnline ? (
              syncStatus === "syncing" ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                  <span className="text-[9px] uppercase tracking-wider font-black text-[var(--text-secondary)]">Syncing</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[9px] uppercase tracking-wider font-black text-[var(--text-secondary)]">Ready</span>
                </>
              )
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[9px] uppercase tracking-wider font-black text-[var(--text-secondary)]">Offline</span>
              </>
            )}
          </div>

          {isInitialized && diagnostics && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface-secondary)] text-[var(--text-secondary)] transition-colors shadow-sm border border-[var(--border-subtle)]" title={diagnostics.cacheSource === "INDEXEDDB_AST" ? "IDB Synced" : "Network JSON"}>
              {diagnostics.cacheSource === "INDEXEDDB_AST" ? (
                <Database className="w-3.5 h-3.5 text-indigo-500" />
              ) : (
                <Cloud className="w-3.5 h-3.5 text-amber-500" />
              )}
            </div>
          )}

          <div className="flex items-center gap-0.5 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl p-1 shadow-sm">
             <div className="relative" ref={calendarRef}>
                <button
                   onClick={() => setIsCalendarOpen(prev => !prev)}
                   className={`p-2 rounded-lg transition-colors cursor-pointer ${
                     isCalendarOpen
                       ? "text-white bg-indigo-600 shadow-sm"
                       : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]"
                   }`}
                   aria-label="Study Planner Quick Access"
                   title="Study Planner"
                >
                   <CalendarIcon className="w-4 h-4" />
                </button>
                <AnimatePresence>
                   {isCalendarOpen && (
                      <CalendarQuickPanel onClose={() => setIsCalendarOpen(false)} />
                   )}
                </AnimatePresence>
             </div>

             <div className="relative" ref={todoRef}>
                <button
                   onClick={() => setIsTodoOpen(prev => !prev)}
                   className={`p-2 rounded-lg transition-colors cursor-pointer ${
                     isTodoOpen
                       ? "text-white bg-indigo-600 shadow-sm"
                       : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]"
                   }`}
                   aria-label="To-Do List Quick Access"
                   title="To-Do List"
                >
                   <ListTodo className="w-4 h-4" />
                </button>
                <AnimatePresence>
                   {isTodoOpen && <TodoQuickPanel />}
                </AnimatePresence>
             </div>

             <button
                onClick={() => setIsGoalSliderOpen(true)}
                className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
                  targetPercent < GOAL_SLIDER_DEFAULT_PERCENT
                    ? "text-white bg-indigo-600 shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]"
                }`}
                aria-label="Focus Target"
                title="Focus Target"
             >
                <Target className="w-4 h-4" />
                {targetPercent < GOAL_SLIDER_DEFAULT_PERCENT && (
                   <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-[var(--surface)]" />
                )}
             </button>

             <div className="w-px h-5 bg-[var(--border)] mx-0.5" />

             <button
                onClick={handleDeveloperReset}
                disabled={isResetting}
                className="p-2 text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                aria-label="Developer Reset"
                title="Perform Hard Reset"
             >
                <ShieldAlert className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`} />
             </button>

             <button
                onClick={toggleTheme}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] rounded-lg transition-colors cursor-pointer"
                aria-label="Toggle Theme"
                suppressHydrationWarning
             >
                {mounted && resolvedTheme === "dark" ? (
                   <Sun className="w-4 h-4" />
                ) : (
                   <Moon className="w-4 h-4" />
                )}
             </button>

             <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] rounded-lg transition-colors cursor-pointer"
             >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
             </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
             initial={{ opacity: 0, height: 0 }}
             animate={{ opacity: 1, height: "auto" }}
             exit={{ opacity: 0, height: 0 }}
             transition={{ duration: 0.2 }}
             className="lg:hidden absolute top-16 left-0 w-full bg-[var(--surface)] border-b border-[var(--border)] shadow-xl overflow-hidden"
          >
            <nav className="flex flex-col p-4 w-full">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                      isActive
                        ? "bg-[var(--surface-secondary)] text-[var(--text-primary)] border border-[var(--border-subtle)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>

    <AnimatePresence>
      {isGoalSliderOpen && <GoalSliderPanel onClose={() => setIsGoalSliderOpen(false)} />}
    </AnimatePresence>
    </>
  );
}
