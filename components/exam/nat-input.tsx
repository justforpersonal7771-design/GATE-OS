"use client";

import { useState, useEffect } from "react";

interface NatInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function NatInput({ value, onChange }: NatInputProps) {
  const [localValue, setLocalValue] = useState(value);

  // Sync with prop when it comes from external (like navigation)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Basic filtering: allow numbers, minus sign, decimal point
    let val = e.target.value.replace(/[^0-9.-]/g, "");

    // Ensure only one decimal point
    const parts = val.split(".");
    if (parts.length > 2) {
      val = parts[0] + "." + parts.slice(1).join("");
    }

    // Ensure minus sign only at the beginning
    if (val.lastIndexOf("-") > 0) {
      val =
        val.substring(0, val.lastIndexOf("-")) +
        val.substring(val.lastIndexOf("-") + 1);
    }

    setLocalValue(val);
    onChange(val);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm w-full">
      <div className="space-y-1">
        <label
          htmlFor="nat-input"
          className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest block"
        >
          Enter Numerical Answer
        </label>
        <span className="text-[10px] text-[var(--text-muted)] font-semibold block leading-tight">
          You can use a minus sign for negative values and a dot for decimals.
        </span>
      </div>
      
      <input
        id="nat-input"
        type="text"
        placeholder="e.g. 1.25"
        autoComplete="off"
        value={localValue}
        onChange={handleChange}
        className="w-full sm:max-w-[200px] text-base px-3 py-2 border border-[var(--border-subtle)] rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-[var(--surface-secondary)] text-[var(--text-primary)] transition-all font-mono shadow-inner placeholder:text-[var(--text-muted)] shrink-0"
      />
    </div>
  );
}
