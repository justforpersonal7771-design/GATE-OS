import "server-only";
import { GoogleGenAI } from "@google/genai";

// SERVER-ONLY. Never import this module from a "use client" component —
// the `server-only` import above makes that a build-time error. The Gemini
// API key must never reach the browser; only app/api/ai/generate/route.ts
// (and other server route handlers) may call getGoogleGenAIClient().

let aiInstance: GoogleGenAI | null = null;

export function getGoogleGenAIClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured. Set it in .env.local (server-side only, no NEXT_PUBLIC_ prefix)."
      );
    }

    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export const GEMINI_MODEL = "gemini-2.5-flash";
