import { Target } from "lucide-react";
import type { GoalTag } from "@/types/exam.types";

export function GoalTagBadge({ tag, className = "" }: { tag: GoalTag; className?: string }) {
  return (
    <span
      title={`Launched from Focus Target: ${tag.topicsCount}/${tag.totalTopics} topics, ${tag.marksCaptured.toFixed(0)}% historical marks captured`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 ${className}`}
    >
      <Target className="w-2.5 h-2.5" />
      Focus {tag.targetPercent}%
    </span>
  );
}
