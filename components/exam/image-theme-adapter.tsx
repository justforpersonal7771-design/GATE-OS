"use client";

import React, { useState, useEffect } from "react";

interface ImageThemeAdapterProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  url: string;
  altText: string;
}

export function ImageThemeAdapter({ url, altText, className, ...props }: ImageThemeAdapterProps) {
  const [profileClass, setProfileClass] = useState("dark:invert dark:hue-rotate-180 dark:brightness-110 dark:contrast-125");

  useEffect(() => {
    // Attempt basic classification based on alt text or URL clues
    const raw = (altText + " " + url).toLowerCase();
    
    if (raw.includes("graph") || raw.includes("plot") || raw.includes("chart")) {
        // Graph Profile
        setProfileClass("dark:brightness-110 dark:contrast-125 bg-white p-2 rounded-lg");
    } else if (raw.includes("table") || raw.includes("matrix")) {
        // Table Profile
        setProfileClass("dark:invert dark:contrast-125");
    } else if (
        raw.includes("er diagram") || 
        raw.includes("dfa") || 
        raw.includes("nfa") || 
        raw.includes("flowchart") || 
        raw.includes("network") ||
        raw.includes("circuit") ||
        raw.includes("diagram")
    ) {
        // Diagram Profile
        setProfileClass("dark:invert dark:hue-rotate-[180deg]");
    } else {
        // Default / Math Figures Profile
        setProfileClass("dark:invert dark:hue-rotate-180 dark:brightness-110 dark:contrast-125");
    }
  }, [url, altText]);

  return (
    <img
      src={url}
      alt={altText}
      className={`max-w-full h-auto max-h-[400px] border border-[var(--border)] rounded-lg object-contain transition-all shadow-sm ${profileClass} ${className || ""}`}
      {...props}
    />
  );
}
