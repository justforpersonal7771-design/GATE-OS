export default function DashboardLoading() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-[var(--text-secondary)] font-medium animate-pulse">Loading dashboard...</p>
      </div>
    </div>
  );
}
