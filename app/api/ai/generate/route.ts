import { NextRequest, NextResponse } from "next/server";
import { getGoogleGenAIClient, GEMINI_MODEL } from "@/lib/ai/gemini";

export const runtime = "nodejs";

function extractErrorMessage(err: any): string {
  let message = err?.message || "Failed to contact Gemini API";
  try {
    if (typeof message === "string" && message.trim().startsWith("{")) {
      const parsed = JSON.parse(message);
      if (parsed?.error?.message) message = parsed.error.message;
    }
  } catch {
    // message wasn't JSON, keep as-is
  }
  return message;
}

/**
 * Server-only Gemini proxy. The API key never leaves this route handler —
 * clients (AIClient) send {systemInstruction, prompt} and get back {text}.
 */
export async function POST(req: NextRequest) {
  let body: { systemInstruction?: string; prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { systemInstruction, prompt } = body;
  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Missing or invalid 'prompt'." }, { status: 400 });
  }

  try {
    const response = await getGoogleGenAIClient().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: typeof systemInstruction === "string" ? systemInstruction : undefined,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json({ error: "Empty response received from Gemini API" }, { status: 502 });
    }

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("AI generate route failed:", err);
    return NextResponse.json({ error: extractErrorMessage(err) }, { status: 502 });
  }
}
