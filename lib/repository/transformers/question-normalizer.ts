import { Question, RenderableQuestion, RenderableOption } from "@/types/question.types";
import { parseToAst } from "./ast-parser";

export interface NormalizationContext {
  year: string;
  shift: string;
  imagesRequired?: string[];
}

export function normalizeQuestion(
  rawQuestion: Question,
  context: NormalizationContext
): RenderableQuestion {
  const yearShift = context.year && context.shift 
    ? `${context.year}-${context.shift}` 
    : "UNKNOWN_YEAR_SHIFT";

  const parserContext = {
    ...context,
    imagesRequired: rawQuestion.images_required || [],
  };

  const questionAst = parseToAst(rawQuestion.question_text || "", parserContext);
  
  let hasImage = false;
  let requiresLatex = false;

  for (const node of questionAst) {
    if (node.type === "image") hasImage = true;
    if (node.type === "latex-inline" || node.type === "latex-display") {
      requiresLatex = true;
    }
  }

  const options: RenderableOption[] = (rawQuestion.options || []).map((opt) => {
    const optAst = parseToAst(opt.text || "", parserContext);
    
    for (const node of optAst) {
       if (node.type === "image") hasImage = true;
       if (node.type === "latex-inline" || node.type === "latex-display") {
         requiresLatex = true;
       }
    }

    return {
      option_id: opt.option_id,
      is_correct: opt.is_correct,
      optionTextRaw: opt.text || "",
      contentAst: optAst,
    };
  });

  let parsedNatRange: any = rawQuestion.nat_answer_range;
  if (typeof parsedNatRange === "string") {
    const parts = (parsedNatRange as string)
      .split("to")
      .map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      parsedNatRange = { min: parts[0], max: parts[1] };
    } else {
      parsedNatRange = undefined;
    }
  }

  return {
    question_no: rawQuestion.question_no,
    question_id: rawQuestion.question_id,
    question_type: rawQuestion.question_type,
    marks: rawQuestion.marks,
    section: rawQuestion.section || "",
    subject: rawQuestion.subject || "",
    topic: rawQuestion.topic || "",
    difficulty: rawQuestion.difficulty,
    year: context.year,
    shift: context.shift,
    year_shift: yearShift,
    questionTextRaw: rawQuestion.question_text || "",
    contentAst: questionAst,
    options: options,
    nat_answer_range: parsedNatRange,
    has_image: hasImage,
    requires_latex: requiresLatex,
  };
}
