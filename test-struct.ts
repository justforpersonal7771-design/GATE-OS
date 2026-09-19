import fs from "fs";
const data = JSON.parse(fs.readFileSync("data/Aggregated_Output.json", "utf-8"));
console.log(Object.keys(data[0]));
