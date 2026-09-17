import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export function getGoogleGenAIClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_GEMINI_API_KEY || (window as any).NEXT_PUBLIC_GEMINI_API_KEY)
      : (process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY);

    if (!apiKey && typeof window === "undefined") {
      console.warn("WARNING: Gemini API Key is not set in environment variables!");
    }

    aiInstance = new GoogleGenAI({
      apiKey: apiKey || ""
    });
  }
  return aiInstance;
}

export const GEMINI_MODEL = "gemini-2.5-flash";
