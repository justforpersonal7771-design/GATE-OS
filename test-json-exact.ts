import fs from "fs";
import { FsmTokenizer } from "./lib/repository/transformers/fsm-tokenizer.ts";
const data = JSON.parse(fs.readFileSync("public/data/Aggregated_Output.json", "utf-8"));

for (const q of data) {
  if (q.question_text && q.question_text.includes("\`\`\`")) {
    const tokens = FsmTokenizer.tokenize(q.question_text);
    console.log(JSON.stringify(tokens, null, 2));
    break;
  }
}
