import { RenderNode, TableNode, TextNode } from "@/types/ast.types";
import { FsmTokenizer } from "@/lib/repository/transformers/fsm-tokenizer";

export class AIResponseParser {
  /**
   * Parse raw text/markdown from Gemini into an array of RenderNodes.
   * Leverages the existing FsmTokenizer and post-processes text blocks to extract tables.
   */
  public static parse(text: string): RenderNode[] {
    if (!text) return [];

    // Normalize LaTeX delimiters (e.g. converting "\ [" to "\[")
    let cleaned = text;
    cleaned = cleaned.replace(/\\\s*\[/g, '\\[');
    cleaned = cleaned.replace(/\\\s*\]/g, '\\]');
    cleaned = cleaned.replace(/\\\s*\(/g, '\\(');
    cleaned = cleaned.replace(/\\\s*\)/g, '\\)');

    // 1. Initial tokenization using the core finite state machine
    const initialNodes = FsmTokenizer.tokenize(cleaned);
    const parsedNodes: RenderNode[] = [];

    // 2. Post-process nodes to extract tables
    for (const node of initialNodes) {
      if (node.type === "text") {
        const textNode = node as TextNode;
        const tableNodes = this.extractTablesFromText(textNode.content);
        parsedNodes.push(...tableNodes);
      } else {
        parsedNodes.push(node);
      }
    }

    return parsedNodes;
  }

  /**
   * Identifies and parses Markdown tables embedded in text blocks.
   */
  private static extractTablesFromText(content: string): RenderNode[] {
    const lines = content.split("\n");
    const result: RenderNode[] = [];
    let currentTableRows: string[][] = [];
    let currentTextBuffer: string[] = [];

    const flushText = () => {
      if (currentTextBuffer.length > 0) {
        result.push({
          type: "text",
          content: currentTextBuffer.join("\n")
        } as TextNode);
        currentTextBuffer = [];
      }
    };

    const flushTable = () => {
      if (currentTableRows.length > 0) {
        // A valid table needs at least a header row and a alignment/separator row
        if (currentTableRows.length >= 2) {
          // Remove separator row (typically containing hyphens: --- | ---)
          const filteredRows = currentTableRows.filter((row, idx) => {
            if (idx === 1 && row.every(cell => /^[:-]+$/.test(cell.trim()) || cell.trim() === "")) {
              return false;
            }
            return true;
          });

          result.push({
            type: "table",
            rows: filteredRows
          } as TableNode);
        } else {
          // If invalid table, format back as regular text
          currentTableRows.forEach(row => {
            currentTextBuffer.push("| " + row.join(" | ") + " |");
          });
        }
        currentTableRows = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check if line represents a markdown table row (starts and ends with |)
      if (line.startsWith("|") && line.endsWith("|")) {
        flushText();
        // Parse cells
        const cells = line
          .split("|")
          .map(cell => cell.trim())
          .slice(1, -1); // remove outer empty elements from start and end pipe
        
        currentTableRows.push(cells);
      } else {
        if (currentTableRows.length > 0) {
          flushTable();
        }
        currentTextBuffer.push(lines[i]);
      }
    }

    // Flush any remaining buffers
    flushText();
    flushTable();

    return result;
  }
}
