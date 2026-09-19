export interface RawTextSegment {
  type: "text";
  content: string;
}

export interface RawTableSegment {
  type: "table";
  rows: string[][];
}

export type RawSegment = RawTextSegment | RawTableSegment;

/**
 * Splits raw question/response text into alternating text and table segments, based on
 * markdown pipe-table lines (`| a | b |`). This MUST run on the raw string before FSM
 * tokenization: table rows often contain inline LaTeX (e.g. `| Iteration ( i ) | ... |`
 * written as `\( i \)`), and the tokenizer splits those into separate text/math tokens —
 * post-processing per already-split token means no single fragment ever looks like a
 * complete "| ... |" line, so table detection silently fails. Splitting first keeps each
 * table row's full original text together; the text segments are then tokenized normally
 * (including any inline math they contain) by the caller.
 */
export function splitTableSegments(raw: string): RawSegment[] {
  const lines = raw.split("\n");
  const result: RawSegment[] = [];
  let currentTableRows: string[][] = [];
  let currentTextBuffer: string[] = [];

  const flushText = () => {
    if (currentTextBuffer.length > 0) {
      result.push({ type: "text", content: currentTextBuffer.join("\n") });
      currentTextBuffer = [];
    }
  };

  const flushTable = () => {
    if (currentTableRows.length > 0) {
      // A valid table needs at least a header row and an alignment/separator row
      if (currentTableRows.length >= 2) {
        // Remove separator row (typically containing hyphens: --- | ---)
        const filteredRows = currentTableRows.filter((row, idx) => {
          if (idx === 1 && row.every(cell => /^[:-]+$/.test(cell.trim()) || cell.trim() === "")) {
            return false;
          }
          return true;
        });
        result.push({ type: "table", rows: filteredRows });
      } else {
        // Not enough rows for a real table — put it back as plain text
        currentTableRows.forEach(row => {
          currentTextBuffer.push("| " + row.join(" | ") + " |");
        });
      }
      currentTableRows = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("|") && line.endsWith("|") && line.length > 1) {
      flushText();
      const cells = line
        .split("|")
        .map(cell => cell.trim())
        .slice(1, -1); // remove outer empty elements from start and end pipe
      currentTableRows.push(cells);
    } else {
      if (currentTableRows.length > 0) flushTable();
      currentTextBuffer.push(rawLine);
    }
  }

  flushText();
  flushTable();

  return result;
}
