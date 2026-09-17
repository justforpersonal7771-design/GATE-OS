import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";

try {
  const envContent = fs.readFileSync(path.resolve(".env.local"), "utf-8");
  const match = envContent.match(/GOOGLE_GENERATIVE_AI_API_KEY\s*=\s*([^\s]+)/);
  if (match) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = match[1];
  }
} catch (e) {
  console.log("Could not load .env.local manually:", e);
}

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
console.log("Using API Key:", apiKey ? apiKey.substring(0, 10) + "..." : "undefined");

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

async function run() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Say 'Hello World' in a premium way.",
    });
    console.log("Gemini Response:", response.text);
  } catch (e) {
    console.error("Gemini API Call failed:", e);
  }
}

run();
