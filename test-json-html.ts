import fs from "fs";
const data = JSON.parse(fs.readFileSync("public/data/Aggregated_Output.json", "utf-8"));

for (const q of data.slice(0, 10)) {
  if (q.question_text && q.question_text.includes("\`\`\`")) {
    console.log(q.question_text);
  }
}
