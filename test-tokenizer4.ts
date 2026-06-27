import { FsmTokenizer } from "./lib/repository/transformers/fsm-tokenizer.ts";
console.log(JSON.stringify(FsmTokenizer.tokenize("```sql\r\nSELECT * FROM students;\r\n```")));
