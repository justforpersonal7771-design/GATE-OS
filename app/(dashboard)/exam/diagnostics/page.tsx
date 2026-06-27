"use client";

import { useEffect, useState } from "react";
import { RepositoryDiagnostics } from "@/lib/repository/question-repository";
import { QuestionRepository } from "@/lib/repository/question-repository";
import { Loader2, Database, AlertCircle, Image as ImageIcon, FileText, Clock, HelpCircle } from "lucide-react";

export default function DiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<RepositoryDiagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        await QuestionRepository.initialize();
        setDiagnostics(QuestionRepository.getDiagnostics());
      } catch (err: any) {
        setError(err.message);
      }
    }
    load();
  }, []);

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Diagnostic Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!diagnostics) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
        <p className="text-[var(--text-muted)]">Compiling and running repository diagnostics...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 w-full mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 border-b pb-4 shrink-0 flex items-center gap-3">
        <Database className="w-6 h-6 text-indigo-600" />
        Repository QA Diagnostics
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<HelpCircle className="w-5 h-5 text-blue-500" />} label="Total Questions" value={diagnostics.totalQuestions} />
        <StatCard icon={<ImageIcon className="w-5 h-5 text-purple-500" />} label="Image Questions" value={diagnostics.imageQuestions} />
        <StatCard icon={<ImageIcon className="w-5 h-5 text-pink-500" />} label="Multi-Image Qs" value={diagnostics.multiImageQuestions} />
        <StatCard icon={<FileText className="w-5 h-5 text-gray-700" />} label="LaTeX Nodes" value={diagnostics.totalLatexNodes} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Performance
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600">Cache Source</span>
              <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm font-medium">{diagnostics.cacheSource}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600">Compilation Time</span>
              <span className="font-mono text-sm">{diagnostics.compilationDurationMs.toFixed(2)} ms</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600">Indexing Time</span>
              <span className="font-mono text-sm">{diagnostics.indexingDurationMs.toFixed(2)} ms</span>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-rose-600">
            <AlertCircle className="w-5 h-5" />
            Health & Failures
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600">Broken Images</span>
              <span className="font-mono text-sm font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded">{diagnostics.brokenImageCount}</span>
            </div>
            
            <div className="pt-2">
              <span className="block text-gray-600 mb-2 font-medium">Unresolved Tokens</span>
              <div className="h-32 overflow-y-auto bg-gray-50 border rounded p-2 text-xs font-mono">
                {diagnostics.imageFailures?.unresolvedTokens.length > 0 
                  ? diagnostics.imageFailures.unresolvedTokens.map((t, i) => <div key={i} className="text-rose-600 mb-1">{t}</div>)
                  : <span className="text-green-600">All tokens resolved perfectly!</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: number | string }) {
  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center gap-4">
      <div className="p-3 bg-gray-50 rounded-full">
        {icon}
      </div>
      <div>
        <p className="text-sm text-[var(--text-muted)] font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
