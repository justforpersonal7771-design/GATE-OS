import fs from "fs";
const data = JSON.parse(fs.readFileSync("public/data/Aggregated_Output.json", "utf-8"));
console.log(Array.isArray(data));
console.log(Object.keys(data).slice(0, 5));
