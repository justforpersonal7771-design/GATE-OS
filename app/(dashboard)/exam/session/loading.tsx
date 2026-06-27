export default function LoadingExamSession() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      <h2 className="text-xl font-bold text-[var(--text-primary)]">
        Loading Exam Engine...
      </h2>
      <p className="text-[var(--text-secondary)]">
        Preparing your question paper and restoring session data.
      </p>
    </div>
  );
}
