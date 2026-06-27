"use client";
import { motion, HTMLMotionProps } from "motion/react";
import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function PremiumCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm dark:shadow-none hover:shadow-md transition-shadow relative overflow-hidden group",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[var(--surface-secondary)] opacity-0 group-hover:opacity-50 transition-opacity" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function GlassCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-[var(--background)]/70 backdrop-blur-xl border border-[var(--border-subtle)] shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  className?: string;
}

export function MetricCard({ title, value, icon: Icon, className }: MetricCardProps) {
  return (
    <PremiumCard className={cn("p-5 flex flex-col justify-between", className)}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-[var(--text-secondary)]">{title}</span>
        <div className="p-2 bg-[var(--surface-secondary)] rounded-lg text-[var(--text-primary)]">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-3xl font-display font-bold tracking-tight text-[var(--text-primary)]">
        {value}
      </div>
    </PremiumCard>
  );
}
