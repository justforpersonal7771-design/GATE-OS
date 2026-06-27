import { FsmTokenizer } from "./lib/repository/transformers/fsm-tokenizer.ts";
console.log(FsmTokenizer.tokenize("This is some text\n```sql\nSELECT * FROM students;\n```\nMore text"));
