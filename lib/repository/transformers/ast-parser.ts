import { RenderNode } from "@/types/ast.types";
import { FsmTokenizer } from "./fsm-tokenizer";
import { buildImageNode, ImageBuilderContext } from "./image-node-builder";

export interface ParserContext extends ImageBuilderContext {}

export function parseToAst(
  text: string,
  context: ParserContext
): RenderNode[] {
  if (!text) return [];

  const rawTokens = FsmTokenizer.tokenize(text);
  const ast: RenderNode[] = [];

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

  return ast;
}
