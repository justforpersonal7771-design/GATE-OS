import fs from "fs";
const data = JSON.parse(fs.readFileSync("public/data/Aggregated_Output.json", "utf-8"));
console.log(Object.keys(data[0]));
