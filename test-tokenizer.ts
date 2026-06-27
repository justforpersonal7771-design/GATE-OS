import { FsmTokenizer } from "./lib/repository/transformers/fsm-tokenizer.ts";
console.log(FsmTokenizer.tokenize("```sql\nSELECT * FROM students;\n```"));
