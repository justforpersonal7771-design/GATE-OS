"use client";

import { Maximize, Minimize } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

interface FullscreenToggleProps {
  targetRef?: React.RefObject<HTMLElement | null>;
  targetId?: string;
  className?: string;
}

export function FullscreenToggle({ targetRef, targetId, className }: FullscreenToggleProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      const el = targetRef?.current || (targetId ? document.getElementById(targetId) : null);
      if (el) {
        if (el.requestFullscreen) {
          el.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
          });
        }
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [targetRef, targetId]);

  return (
    <button
      onClick={toggleFullscreen}
      className={`p-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border)] transition-colors shadow-sm ${className || ''}`}
      title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
    >
      {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
    </button>
  );
}
