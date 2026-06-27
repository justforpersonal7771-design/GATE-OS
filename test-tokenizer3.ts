import { FsmTokenizer } from "./lib/repository/transformers/fsm-tokenizer.ts";
console.log(JSON.stringify(FsmTokenizer.tokenize("Consider the following C statements:\n```c\nchar *str1 = \"Hello;  /* Statement S1 */\nchar *str2 = \"Hello;\"; /* Statement S2 */\nint *str3 = \"Hello\";   /* Statement S3 */\n```\nWhich of the following options is/are correct?")));
