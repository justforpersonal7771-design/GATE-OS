"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { ZoomIn, X, Maximize2 } from "lucide-react";

interface PremiumImageGalleryProps {
  urls: string[];
  altText: string;
}

export function PremiumImageGallery({ urls, altText }: PremiumImageGalleryProps) {
  const [activeZoomUrl, setActiveZoomUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Classification for dark mode inversion
  const getProfileClass = (url: string, alt: string) => {
    const raw = (alt + " " + url).toLowerCase();
    if (raw.includes("graph") || raw.includes("plot") || raw.includes("chart")) {
      return "dark:brightness-110 dark:contrast-125 bg-white p-2 rounded-lg";
    } else if (raw.includes("table") || raw.includes("matrix")) {
      return "dark:invert dark:contrast-125";
    } else if (
      raw.includes("er diagram") || 
      raw.includes("dfa") || 
      raw.includes("nfa") || 
      raw.includes("flowchart") || 
      raw.includes("network") ||
      raw.includes("circuit") ||
      raw.includes("diagram")
    ) {
      return "dark:invert dark:hue-rotate-[180deg]";
    }
    return "dark:invert dark:hue-rotate-180 dark:brightness-110 dark:contrast-125";
  };

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveZoomUrl(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const numImages = urls.length;

  // Determine container grid/masonry styling
  let layoutClass = "";
  if (numImages === 1) {
    layoutClass = "flex justify-center w-full";
  } else if (numImages === 2) {
    layoutClass = "grid grid-cols-1 md:grid-cols-2 gap-6 w-full";
  } else if (numImages === 3) {
    layoutClass = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full";
  } else {
    // 4 or more: Adaptive masonry columns
    layoutClass = "columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6 w-full";
  }

  return (
    <div className="w-full my-6">
      <div className={layoutClass}>
        {urls.map((url, index) => {
          const profile = getProfileClass(url, altText);
          const isMasonry = numImages >= 4;

          return (
            <motion.div
              key={url + index}
              whileHover={{ scale: 1.015 }}
              className={`relative overflow-hidden border border-[var(--border)] rounded-2xl bg-[var(--surface-secondary)] group flex items-center justify-center p-3 cursor-zoom-in ${
                isMasonry ? "inline-block w-full mb-6 break-inside-avoid" : ""
              }`}
              onClick={() => setActiveZoomUrl(url)}
            >
              <img
                src={url}
                alt={altText}
                loading="lazy"
                className={`max-w-full h-auto max-h-[360px] md:max-h-[450px] object-contain rounded-xl select-none pointer-events-none transition-all duration-300 ${profile}`}
              />
              
              {/* Premium Hover Zoom Overlay indicator */}
              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 rounded-2xl">
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white shadow-xl">
                  <ZoomIn className="w-5 h-5" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ZOOM LIGHTBOX MODAL — portaled to document.body. This image gallery can be
          rendered anywhere content shows up (question cards, bookmarks, mistakes lists),
          many of which sit inside a motion.div with a whileHover transform. A transformed
          ancestor becomes the containing block for position:fixed descendants, which was
          making this "fullscreen" lightbox render relative to that card instead of the
          viewport — appearing over the wrong images/Topbar instead of truly fullscreen.
          Portaling to body sidesteps the whole class of bug regardless of where this
          component is mounted. */}
      {mounted && createPortal(
        <AnimatePresence>
          {activeZoomUrl && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 md:px-8">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveZoomUrl(null)}
                className="absolute inset-0 bg-black/85 backdrop-blur-md"
              />

              {/* Close Button */}
              <button
                onClick={() => setActiveZoomUrl(null)}
                className="absolute top-4 right-4 z-10 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* High Resolution Zoom Image */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative max-w-full max-h-[85vh] z-10 p-2 overflow-hidden flex items-center justify-center"
              >
                <img
                  src={activeZoomUrl}
                  alt="Zoomed Content"
                  className={`max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl select-none ${getProfileClass(activeZoomUrl, altText)}`}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
