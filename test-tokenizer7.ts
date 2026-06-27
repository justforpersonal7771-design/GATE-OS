import { FsmTokenizer } from "./lib/repository/transformers/fsm-tokenizer.ts";
console.log(FsmTokenizer.tokenize("<p>\`\`\`sql<br>SELECT * FROM students;<br>\`\`\`</p>"));
