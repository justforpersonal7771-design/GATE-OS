const badJson = `{
  "concept": "Calculating \\\\( \\\\text{Protagonist} = \\\\text{The principal character} \\\\)",
  "formula": "\\\\( \\\\text{Antagonist} = \\\\text{A character} \\\\)"
}`;

function cleanJsonString(raw: string): string {
  let str = raw.trim();
  if (str.startsWith("```")) {
    const lines = str.split("\n");
    if (lines[0].startsWith("```")) lines.shift();
    if (lines[lines.length - 1].startsWith("```")) lines.pop();
    str = lines.join("\n").trim();
  }
  // Fix trailing commas
  str = str.replace(/,\s*([\]}])/g, '$1');
  return str;
}

console.log("Original:");
console.log(badJson);
console.log("\nCleaned:");
const cleaned = cleanJsonString(badJson);
console.log(cleaned);
try {
  JSON.parse(cleaned);
  console.log("SUCCESS!");
} catch (e: any) {
  console.log("FAILED:", e.message);
}
