"use client";
import React from "react";
import { motion, HTMLMotionProps } from "motion/react";
import { twMerge } from "tailwind-merge";
import { clsx, type ClassValue } from "clsx";
import { Loader2 } from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none relative overflow-hidden";
  
  const variants = {
    primary: "bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] focus:ring-[var(--accent)]",
    secondary: "bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--border)] focus:ring-[var(--text-secondary)]",
    ghost: "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] focus:ring-[var(--border)]",
    danger: "bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 focus:ring-[var(--danger)]",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...(props as any)}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children as React.ReactNode}
    </motion.button>
  );
}
