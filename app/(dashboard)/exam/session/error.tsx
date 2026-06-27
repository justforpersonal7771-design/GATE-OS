"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ErrorExamSession({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error("Exam Session Error:", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] space-y-6 px-4 text-center">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-[var(--text-primary)]">
        Something went wrong!
      </h2>
      <p className="text-[var(--text-secondary)] max-w-md">
        An error occurred while attempting to render the exam session. Your
        progress has been auto-saved up to the last interacted question.
      </p>

      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-2.5 bg-[var(--surface)] border border-[var(--border)] hover:bg-gray-50 dark:hover:bg-gray-800 text-[var(--text-secondary)] rounded-lg font-bold shadow-sm transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
