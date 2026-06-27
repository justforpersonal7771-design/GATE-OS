"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Something went wrong!</h2>
      <p className="text-[var(--text-secondary)] max-w-md text-center">{error.message || "An unexpected error occurred in the dashboard."}</p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
