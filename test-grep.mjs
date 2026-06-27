import fs from "fs";
const data = fs.readFileSync("public/data/Aggregated_Output.json", "utf-8");
const matches = [];
for (const line of data.split("\n")) {
  if (line.includes("\`\`\`")) matches.push(line);
}
console.log(matches.slice(0, 10).join("\n"));
