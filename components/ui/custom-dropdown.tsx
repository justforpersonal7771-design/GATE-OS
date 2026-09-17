"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  label: string;
  value: string;
  subLabel?: string;
}

interface CustomDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CustomDropdown({ options, value, onChange, placeholder = "Select...", className = "" }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--surface-secondary)] hover:bg-[var(--surface-secondary)]/80 hover:border-[var(--border-strong)] border border-[var(--border)] rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-[var(--info)] transition-all cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`block truncate ${!selectedOption ? "text-[var(--text-muted)]" : "text-[var(--text-primary)] font-medium"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 w-full mt-2 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-xl shadow-lg max-h-60 overflow-auto custom-scrollbar focus:outline-none"
            role="listbox"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-4 py-2 cursor-pointer transition-colors ${
                    isSelected ? "bg-[var(--info)]/10 text-[var(--info)]" : "text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className={`block truncate ${isSelected ? "font-bold text-xs" : "font-medium text-xs text-[var(--text-primary)]"}`}>
                      {option.label}
                    </span>
                    {option.subLabel && (
                      <span className="block text-[10px] text-[var(--text-muted)] font-medium mt-0.5">
                        {option.subLabel}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[var(--info)] shrink-0" />}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
