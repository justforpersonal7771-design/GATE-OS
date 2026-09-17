import fs from "fs";
const data = JSON.parse(fs.readFileSync("./public/data/Aggregated_Output.json", "utf-8"));

let withImage = null, withCode = null, withTable = null, withMath = null;

function walk(obj, ctx) {
  if (Array.isArray(obj)) { obj.forEach(o => walk(o, ctx)); return; }
  if (obj && typeof obj === "object") {
    const yearShift = obj.year_shift || ctx;
    if (obj.question_id && obj.question_text) {
      const t = obj.question_text;
      if (!withImage && obj.has_image) withImage = { id: obj.question_id, yearShift, images: obj.images_required };
      if (!withCode && t.includes("```")) withCode = { id: obj.question_id, yearShift, snippet: t.slice(0, 200) };
      if (!withTable && /\|.*\|.*\|/.test(t)) withTable = { id: obj.question_id, yearShift, snippet: t.slice(0, 200) };
      if (!withMath && (t.includes("\\(") || t.includes("\\["))) withMath = { id: obj.question_id, yearShift };
    }
    Object.values(obj).forEach(v => walk(v, yearShift));
  }
}
walk(data, null);
console.log("IMAGE:", JSON.stringify(withImage));
console.log("CODE:", JSON.stringify(withCode));
console.log("TABLE:", JSON.stringify(withTable));
console.log("MATH:", JSON.stringify(withMath));
