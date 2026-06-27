import fs from "fs";
import { FsmTokenizer } from "./lib/repository/transformers/fsm-tokenizer.ts";
const data = JSON.parse(fs.readFileSync("public/data/Aggregated_Output.json", "utf-8"));
for (const paper of data) {
  for (const q of paper.questions) {
    if (q.question_text && q.question_text.indexOf("```") !== -1) {
      console.log(JSON.stringify(FsmTokenizer.tokenize(q.question_text), null, 2));
      process.exit(0);
    }
  }
}
