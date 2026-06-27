"use client";

import { memo } from "react";
import { RenderableOption } from "@/types/question.types";
import { AstNodeRenderer } from "./ast-node-renderer";
import { Check, Circle } from "lucide-react";

interface OptionRendererProps {
  option: RenderableOption;
  index: number;
  isSelected: boolean;
  onSelect: (optionId: string) => void;
  type: "MCQ" | "MSQ";
}

export const OptionRenderer = memo(function OptionRenderer({
  option,
  index,
  isSelected,
  onSelect,
  type,
}: OptionRendererProps) {
  const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const label = letters[index] || (index + 1).toString();

  return (
    <button
      onClick={() => onSelect(option.option_id)}
      className={`
        w-full flex items-start gap-3 p-3 rounded-xl border-[2px] transition-all text-left group overflow-hidden
        ${
          isSelected
            ? "border-[var(--option-border-selected)] bg-[var(--option-selected)]"
            : "border-[var(--option-border)] bg-[var(--option-surface)] hover:border-[var(--option-border-selected)] hover:bg-[var(--option-hover)]"
        }
      `}
    >
      <div
        className={`
        flex-shrink-0 w-8 h-8 rounded flex items-center justify-center font-bold text-sm transition-colors mt-0.5
        ${
          isSelected
            ? "bg-[var(--info)] text-white"
            : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] group-hover:bg-[var(--info)]/20 shadow-sm"
        }
        ${type === "MCQ" ? "rounded-full" : "rounded-md"}
      `}
      >
        {label}
      </div>

      <div className="flex-1 mt-0.5 overflow-hidden break-words text-[var(--question-text)] font-medium">
        <AstNodeRenderer nodes={option.contentAst} className="inline-block max-w-full" />
      </div>

      <div className="flex-shrink-0 ml-2 mt-1.5 transition-opacity">
        {type === "MCQ" ? (
          <div
             className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-[var(--info)]" : "border-[var(--border)]"}`}
          >
            {isSelected && (
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--info)]" />
            )}
          </div>
        ) : (
          <div
             className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? "border-[var(--info)] bg-[var(--info)]" : "border-[var(--border)]"}`}
          >
            {isSelected && (
              <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
            )}
          </div>
        )}
      </div>
    </button>
  );
});
