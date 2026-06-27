import fs from "fs";
const data = JSON.parse(fs.readFileSync("public/data/Aggregated_Output.json", "utf-8"));
for (const q of data) {
  if (q.question_text && q.question_text.indexOf("```") !== -1) {
    console.log("FOUND!!!");
    console.log(q.question_text);
    break;
  }
}
