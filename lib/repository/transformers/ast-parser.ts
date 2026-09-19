import { RenderNode, TableNode } from "@/types/ast.types";
import { FsmTokenizer } from "./fsm-tokenizer";
import { buildImageNode, ImageBuilderContext } from "./image-node-builder";
import { splitTableSegments } from "./table-extractor";

export interface ParserContext extends ImageBuilderContext {}

export function parseToAst(
  text: string,
  context: ParserContext
): RenderNode[] {
  if (!text) return [];

  const ast: RenderNode[] = [];

  // Split out markdown pipe-tables BEFORE tokenizing — table rows often contain inline
  // LaTeX, and tokenizing first would fragment each row across separate text/math tokens,
  // so no single fragment would ever look like a complete "| a | b |" line.
  const segments = splitTableSegments(text);

  for (const segment of segments) {
    if (segment.type === "table") {
      ast.push({ type: "table", rows: segment.rows } as TableNode);
      continue;
    }

    const rawTokens = FsmTokenizer.tokenize(segment.content);
    for (const token of rawTokens) {
      if (token.type === "text") {
        if (token.content === "") {
          continue;
        }
        ast.push(token);
      } else if (token.type === "image") {
        // Rebuild the image node to ensure it contains resolved URL and metadata
        // Since FSM Tokenizer only captures the raw string
        const imageNode = buildImageNode((token as any).originalToken, context);
        ast.push(imageNode);
      } else {
        ast.push(token);
      }
    }
  }

  return ast;
}
