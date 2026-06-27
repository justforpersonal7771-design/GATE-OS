"use client";

import { memo, useCallback } from "react";
import { RenderableQuestion } from "@/types/question.types";
import { QuestionResponse } from "@/types/exam-runtime.types";
import { AstNodeRenderer } from "./ast-node-renderer";
import { OptionRenderer } from "./option-renderer";
import { NatInput } from "./nat-input";
import { FullscreenToggle } from "../ui/fullscreen-toggle";
import { FullscreenNavigation } from "../ui/fullscreen-navigation";

interface QuestionRendererProps {
  question: RenderableQuestion;
  response: QuestionResponse;
  onResponseUpdate: (payload: Partial<QuestionResponse>) => void;
  onPrev?: () => void;
  onNext?: () => void;
  isPrevDisabled?: boolean;
  isNextDisabled?: boolean;
}

export const QuestionRenderer = memo(function QuestionRenderer({
  question,
  response,
  onResponseUpdate,
  onPrev,
  onNext,
  isPrevDisabled,
  isNextDisabled,
}: QuestionRendererProps) {
  const handleOptionSelect = useCallback((optionId: string) => {
    let newSelections = response?.selectedOptions
      ? [...response.selectedOptions]
      : [];

    if (question.question_type === "MCQ") {
      newSelections = [optionId];
    } else if (question.question_type === "MSQ") {
      if (newSelections.includes(optionId)) {
        newSelections = newSelections.filter((id) => id !== optionId);
      } else {
        newSelections.push(optionId);
      }
    }

    if (newSelections.length === 0) {
      onResponseUpdate({
        status: "VISITED",
        selectedOptions: [],
      });
    } else {
      onResponseUpdate({
        status: "ANSWERED",
        selectedOptions: newSelections,
      });
    }
  }, [response?.selectedOptions, question.question_type, onResponseUpdate]);

  const handleNatChange = useCallback((val: string) => {
    // If user empties the input, revert to visited
    if (!val.trim()) {
      onResponseUpdate({
        status: "VISITED",
        natValue: "",
      });
    } else {
      onResponseUpdate({
        status: "ANSWERED",
        natValue: val,
      });
    }
  }, [onResponseUpdate]);

  return (
    <div id="exam-question-container" className="flex flex-col h-full w-full bg-[var(--question-surface)] animate-in fade-in slide-in-from-bottom-2 duration-300 relative">
      <div className="absolute top-4 right-4 z-50">
        <FullscreenToggle targetId="exam-question-container" />
      </div>
      {onPrev && onNext && (
        <FullscreenNavigation
          onPrev={onPrev}
          onNext={onNext}
          isPrevDisabled={isPrevDisabled}
          isNextDisabled={isNextDisabled}
        />
      )}
      {/* Main Question Text (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-12 custom-scrollbar">
        <div className="text-lg md:text-xl font-medium leading-relaxed text-[var(--question-text)] mb-8">
          <AstNodeRenderer nodes={question.contentAst} />
        </div>
      </div>

      {/* Options or NAT Input (Fixed at bottom) */}
      <div className="flex-none bg-[var(--question-surface)] px-4 py-6 sm:px-12 border-t border-[var(--question-border)] shadow-sm dark:shadow-none z-10 w-full relative">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-[var(--surface-secondary)] opacity-0 dark:opacity-0 transition-opacity" />
        <div className="w-full relative z-10">
          {question.question_type === "NAT" ? (
            <NatInput
              value={response?.natValue || ""}
              onChange={handleNatChange}
            />
          ) : (
            <div className={`grid gap-3 ${question.options?.some(opt => opt.contentAst.some(n => n.type === 'image')) ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
              {question.options?.map((opt, idx) => (
                <div key={opt.option_id} className={question.options?.some(opt => opt.contentAst.some(n => n.type === 'image')) ? 'hover:scale-105 transition-transform overflow-hidden max-w-full' : ''}>
                  <OptionRenderer
                    option={opt}
                    index={idx}
                    type={question.question_type as "MCQ" | "MSQ"}
                    isSelected={(response?.selectedOptions || []).includes(
                      opt.option_id,
                    )}
                    onSelect={handleOptionSelect}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
