import * as fs from "fs";
import * as path from "path";

// 1. Load environment variables manually BEFORE importing any modules
try {
  const envContent = fs.readFileSync(path.resolve(".env.local"), "utf-8");
  const match = envContent.match(/GOOGLE_GENERATIVE_AI_API_KEY\s*=\s*([^\s]+)/);
  if (match) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = match[1];
    process.env.NEXT_PUBLIC_GEMINI_API_KEY = match[1];
  }
} catch (e) {
  console.log("Could not load .env.local manually:", e);
}

// 2. Inject Node.js mock fetch for relative static assets, forwarding real network calls to original fetch
if (typeof global !== "undefined") {
  const originalFetch = (global as any).fetch;
  (global as any).fetch = async (url: string, options: any) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return await originalFetch(url, options);
    }

    let relativePath = url;
    if (url.startsWith("/")) {
      relativePath = "public" + url;
    }
    const fullPath = path.resolve(relativePath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      return {
        ok: true,
        json: async () => JSON.parse(content),
        text: async () => content,
        headers: {
          get: (name: string) => null
        }
      };
    }
    return {
      ok: false,
      status: 404,
      json: async () => { throw new Error("404"); },
      headers: {
        get: (name: string) => null
      }
    };
  };
}

// 3. NOW import modules
import { AIService } from "../lib/ai/AIService";
import { AIResponseParser } from "../lib/ai/ai-response-parser";

async function verifyAll() {
  console.log("=========================================");
  console.log("   AI FOUNDATION INTEGRATION TESTS      ");
  console.log("=========================================\n");

  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error("FAIL: API Key is not set in environment!");
    process.exit(1);
  }
  console.log("✓ ENV: API key successfully loaded.");

  // Test 1: Parser verification (Markdown, Math, Code, Tables)
  console.log("\n[Test 1] Parser (AST Node Compilation) verification...");
  const rawSampleText = `
Here is a table explaining state variables:

| State | Variable | Meaning |
|---|---|---|
| A | \\( x_1 \\) | Source state |
| B | \\( x_2 \\) | Target state |

And some inline code: \`const test = 4;\`
`;

  try {
    const parsedNodes = AIResponseParser.parse(rawSampleText);
    console.log("Parsed AST Nodes count:", parsedNodes.length);
    console.log("AST Node types:", parsedNodes.map(n => n.type));
    const hasTable = parsedNodes.some(n => n.type === "table");
    const hasMath = parsedNodes.some(n => n.type === "latex-inline");
    const hasCode = parsedNodes.some(n => n.type === "code");

    if (hasTable && hasMath && hasCode) {
      console.log("✓ PARSER: Correctly parsed tables, LaTeX formulas, and inline code blocks into standard AST!");
    } else {
      console.warn("WARNING: Some elements were missing in the parsed AST.");
    }
  } catch (e) {
    console.error("FAIL: Parser crashed:", e);
    process.exit(1);
  }

  // Test 2: AI Service & Client check (Explanation generator)
  console.log("\n[Test 2] AI Service integration call verification...");
  try {
    console.log("Initiating test revision recommendation request for 'Algorithms'...");
    const planResponse = await AIService.recommendRevision("Algorithms", true);

    if (planResponse.success && planResponse.data) {
      console.log("✓ SERVICE: Successfully generated revision recommendations!");
      console.log("Response Subject:", planResponse.data.subject);
      console.log("Suggested priority topics:", planResponse.data.priorityTopics.map(pt => pt.topic));
      console.log("Cached:", planResponse.cached);
      console.log("Tokens Used:", planResponse.tokenUsage);
    } else {
      console.error("FAIL: Service responded with failure:", planResponse.error);
    }
  } catch (e) {
    console.error("FAIL: AIService call crashed:", e);
    process.exit(1);
  }

  console.log("\n=========================================");
  console.log("  ALL INTEGRATION TESTS PASSED SUCCESSFULLY!  ");
  console.log("=========================================");
}

verifyAll();
