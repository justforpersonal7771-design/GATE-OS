import {
  RenderNode,
  TextNode,
  MathInlineNode,
  MathDisplayNode,
  ImageNode,
} from "@/types/ast.types";

export class FsmTokenizer {
  public static tokenize(input: string): RenderNode[] {
    if (!input) return [];

    const tokens: RenderNode[] = [];
    let state:
      | "READ_TEXT"
      | "IN_INLINE_MATH_DOLLAR"
      | "IN_INLINE_MATH_PAREN"
      | "IN_DISPLAY_MATH_DOLLAR"
      | "IN_DISPLAY_MATH_BRACKET"
      | "IN_IMAGE_TOKEN"
      | "IN_CODE_BLOCK"
      | "IN_INLINE_CODE" = "READ_TEXT";

    let buffer = "";
    let language = "";
    let i = 0;
    const len = input.length;

    const flushText = () => {
      if (buffer.length > 0) {
        tokens.push({ type: "text", content: buffer } as TextNode);
        buffer = "";
      }
    };

    while (i < len) {
      const char = input[i];

      switch (state) {
        case "READ_TEXT":
          if (char === "\\") {
            // Check for escaped characters or math environments
            if (i + 1 < len) {
              const nextChar = input[i + 1];
              if (nextChar === "[") {
                flushText();
                state = "IN_DISPLAY_MATH_BRACKET";
                i++; // skip [
              } else if (nextChar === "(") {
                flushText();
                state = "IN_INLINE_MATH_PAREN";
                i++; // skip (
              } else if (nextChar === "$") {
                buffer += "$"; // Keep literal $
                i++;
              } else {
                // LaTeX text-formatting commands (\textbf{}, \textit{}, \emph{})
                // are valid LaTeX and render correctly when MathJax already owns
                // them inside a \( \) / \[ \] span — this branch only runs in
                // plain-text mode, where they'd otherwise leak as raw
                // "\textit{...}" text since nothing else understands them here.
                // Converted to the markdown emphasis formatMarkdownText already
                // handles, instead of inventing a new AST node type for it.
                const formatMatch = input.slice(i).match(/^\\(textbf|textit|emph)\{/);
                if (formatMatch) {
                  const cmdLen = formatMatch[0].length;
                  const isBold = formatMatch[1] === "textbf";
                  let depth = 1;
                  let j = i + cmdLen;
                  while (j < len && depth > 0) {
                    if (input[j] === "{") depth++;
                    else if (input[j] === "}") depth--;
                    if (depth > 0) j++;
                  }
                  const inner = input.slice(i + cmdLen, j);
                  const marker = isBold ? "**" : "*";
                  buffer += `${marker}${inner}${marker}`;
                  i = j; // land on the closing brace; loop's i++ steps past it
                } else {
                  buffer += char;
                }
              }
            } else {
              buffer += char;
            }
          } else if (char === "$") {
            if (i + 1 < len && input[i + 1] === "$") {
              flushText();
              state = "IN_DISPLAY_MATH_DOLLAR";
              i++; // skip second $
            } else {
              flushText();
              state = "IN_INLINE_MATH_DOLLAR";
            }
          } else if (char === "`") {
            if (i + 2 < len && input[i + 1] === "`" && input[i + 2] === "`") {
              flushText();
              state = "IN_CODE_BLOCK";
              language = "";
              i += 2; // skip the next two backticks
              
              // Optionally extract language
              let j = i + 1;
              while (j < len && input[j] !== '\n' && input[j] !== ' ') {
                language += input[j];
                j++;
              }
              i = j; // skip to end of language or newline
              if(input[i] === '\n') {
                  // Do nothing, i will be incremented at the end of the loop, skipping the \n. If it's a space, it will also be skipped.
              } else {
                 i--; // if it's not and we just hit something else, adjust. Actually it's fine.
              }
            } else {
              flushText();
              state = "IN_INLINE_CODE";
            }
          } else if (char === "[") {
            if (input.substring(i + 1, i + 7) === "IMAGE_") {
              flushText();
              state = "IN_IMAGE_TOKEN";
              buffer += char;
            } else {
              buffer += char;
            }
          } else {
            buffer += char;
          }
          break;

        case "IN_INLINE_MATH_DOLLAR":
          if (char === "\\" && i + 1 < len) {
            buffer += char + input[i + 1];
            i++;
          } else if (char === "$") {
            tokens.push({
              type: "latex-inline",
              content: buffer,
            } as MathInlineNode);
            buffer = "";
            state = "READ_TEXT";
          } else {
            buffer += char;
          }
          break;

        case "IN_INLINE_MATH_PAREN":
          if (char === "\\" && i + 1 < len && input[i + 1] === ")") {
            tokens.push({
              type: "latex-inline",
              content: buffer,
            } as MathInlineNode);
            buffer = "";
            state = "READ_TEXT";
            i++;
          } else {
            buffer += char;
          }
          break;

        case "IN_DISPLAY_MATH_DOLLAR":
          if (char === "$" && i + 1 < len && input[i + 1] === "$") {
            tokens.push({
              type: "latex-display",
              content: buffer,
            } as MathDisplayNode);
            buffer = "";
            state = "READ_TEXT";
            i++;
          } else {
            buffer += char;
          }
          break;

        case "IN_DISPLAY_MATH_BRACKET":
          if (char === "\\" && i + 1 < len && input[i + 1] === "]") {
            tokens.push({
              type: "latex-display",
              content: buffer,
            } as MathDisplayNode);
            buffer = "";
            state = "READ_TEXT";
            i++;
          } else {
            buffer += char;
          }
          break;

        case "IN_IMAGE_TOKEN":
          buffer += char;
          if (char === "]") {
            tokens.push({
              type: "image",
              originalToken: buffer,
              resolvedUrl: "", // Resolved by Compiler
              altText: buffer,
              hasError: false,
            } as ImageNode);
            buffer = "";
            state = "READ_TEXT";
          }
          break;

        case "IN_CODE_BLOCK":
          if (char === "`" && i + 2 < len && input[i + 1] === "`" && input[i + 2] === "`") {
            tokens.push({
              type: "code",
              language: language.trim(),
              content: buffer,
            } as any); // Type assertion, need to import CodeNode later if not imported
            buffer = "";
            language = "";
            state = "READ_TEXT";
            i += 2; // Skip the closing backticks
          } else {
            buffer += char;
          }
          break;

        case "IN_INLINE_CODE":
          if (char === "`") {
            tokens.push({
              type: "code",
              language: "inline", // Denote inline
              content: buffer,
            } as any);
            buffer = "";
            state = "READ_TEXT";
          } else {
            buffer += char;
          }
          break;
      }
      i++;
    }

    if (buffer.length > 0) {
      if (state === "IN_INLINE_MATH_DOLLAR") {
        buffer = "$" + buffer;
      } else if (state === "IN_INLINE_MATH_PAREN") {
        buffer = "\\(" + buffer;
      } else if (state === "IN_DISPLAY_MATH_DOLLAR") {
        buffer = "$$" + buffer;
      } else if (state === "IN_DISPLAY_MATH_BRACKET") {
        buffer = "\\[" + buffer;
      } else if (state === "IN_CODE_BLOCK") {
        buffer = "```" + language + "\n" + buffer;
      } else if (state === "IN_INLINE_CODE") {
        buffer = "`" + buffer;
      }
      tokens.push({ type: "text", content: buffer } as TextNode);
    }

    return tokens;
  }
}
