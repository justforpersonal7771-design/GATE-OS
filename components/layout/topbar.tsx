import { motion, AnimatePresence } from "motion/react";

// ... keep icons and other imports
import { useDataStore } from "@/store/use-data-store";
import { Moon, Sun, Cloud, Database, LayoutDashboard, Settings, BookOpen, PieChart, ClipboardList, Bookmark, RefreshCw, Menu, X, ShieldAlert } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Exam Setup", href: "/setup", icon: Settings },
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
      alert("Reset failed: " + e);
    }
  };

  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="w-full h-full px-4 sm:px-6 md:px-8 flex items-center justify-between">
        
        {/* Logo and Desktop Nav */}
        <div className="flex items-center gap-8 h-full">
          <Link href="/" className="font-bold text-xl text-[var(--accent)] shrink-0 flex items-center gap-2 group">
             <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-[var(--background)] flex items-center justify-center transition-transform group-hover:scale-105 group-hover:rotate-3 shadow-md">
                G
             </div>
             GATE OS
          </Link>
          
          <nav className="hidden lg:flex items-center h-full gap-2 relative">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-colors z-10 ${
                    isActive
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="topbar-active-pill"
                      className="absolute inset-0 bg-[var(--surface-secondary)] rounded-md border border-[var(--border-subtle)] -z-10 shadow-sm"
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

          <div className="flex items-center gap-1">
             <button
                onClick={handleDeveloperReset}
                disabled={isResetting}
                className="p-2 text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-md transition-colors disabled:opacity-50"
                aria-label="Developer Reset"
                title="Perform Hard Reset"
             >
                <ShieldAlert className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`} />
             </button>

             <button
                onClick={toggleTheme}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] rounded-md transition-colors"
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
                className="lg:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] rounded-md transition-colors"
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
  );
}
