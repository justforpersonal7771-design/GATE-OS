import { getGoogleGenAIClient, GEMINI_MODEL } from "./gemini";
import { RateLimiter } from "./rate-limiter";
import { TokenEstimator } from "./token-estimator";
import { IDBManager } from "../repository/storage/idb-manager";
import { AIResponse, AITokenUsage } from "@/types/ai.types";

export class AIClient {
  /**
   * Deterministic hash helper to generate cache keys.
   */
  public static generateHash(systemInstruction: string, prompt: string): string {
    const combined = `${systemInstruction}||${prompt}`;
    let hash = 5381;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash * 33) ^ combined.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
  }

  private static cleanJsonString(raw: string): string {
    let str = raw.trim();
    if (str.startsWith("```")) {
      const lines = str.split("\n");
      if (lines[0].startsWith("```")) lines.shift();
      if (lines[lines.length - 1].startsWith("```")) lines.pop();
      str = lines.join("\n").trim();
    }
    // Fix trailing commas
    str = str.replace(/,\s*([\]}])/g, '$1');
    
    // Character by character escaping of invalid LaTeX backslash escapes in JSON strings
    let result = "";
    let i = 0;
    while (i < str.length) {
      const char = str.charAt(i);
      if (char === '\\') {
        if (i + 1 < str.length) {
          const next = str.charAt(i + 1);
          
          let isControlChar = false;
          if (next === 'n' || next === 't' || next === 'r' || next === 'b' || next === 'f') {
            if (i + 2 < str.length) {
              const third = str.charAt(i + 2);
              if (!/[a-zA-Z]/.test(third)) {
                isControlChar = true;
              }
            } else {
              isControlChar = true;
            }
          } else if (next === '"' || next === '\\' || next === '/') {
            isControlChar = true;
          } else if (next === 'u' && i + 5 < str.length && /^[0-9a-fA-F]{4}$/.test(str.substring(i + 2, i + 6))) {
            isControlChar = true;
          }

          if (isControlChar) {
            result += '\\' + next;
            i += 2;
            if (next === 'u') {
              result += str.substring(i, i + 4);
              i += 4;
            }
            continue;
          }
        }
        // Double escape invalid escapes (like \c in \cdot, \l in \log, \f in \frac)
        result += '\\\\';
        i++;
      } else {
        result += char;
        i++;
      }
    }
    return result;
  }

  /**
   * Dispatches request to Google Gemini under rate limiter guards, incorporating IDB caching.
   */
  public static async request<T>(
    requestId: string,
    systemInstruction: string,
    prompt: string,
    options: {
      questionId?: string;
      topic?: string;
      ttlHours?: number;
      bypassCache?: boolean;
    } = {}
  ): Promise<AIResponse<T>> {
    const hash = this.generateHash(systemInstruction, prompt);
    const bypassCache = options.bypassCache || false;
    const ttlHours = options.ttlHours || 24; // 24 hours cache duration by default

    // 1. Caching check
    if (!bypassCache) {
      const cachedRecord = await IDBManager.getAIResponse(hash);
      if (cachedRecord) {
        try {
          const parsedData = JSON.parse(cachedRecord.response) as T;
          return {
            success: true,
            data: parsedData,
            cached: true,
          };
        } catch {
          // If parse fails, proceed to live request
        }
      }
    }

    try {
      // 2. Rate Limited Request execution
      const apiResponse = await RateLimiter.enqueue(requestId, async (signal) => {
        const response = await getGoogleGenAIClient().models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json"
          }
        });

        if (signal.aborted) {
          throw new Error("Request aborted");
        }

        return response;
      });

      const responseText = apiResponse.text;
      if (!responseText) {
        throw new Error("Empty response received from Gemini API");
      }

      // Parse JSON payload
      const cleaned = this.cleanJsonString(responseText);
      const data = JSON.parse(cleaned) as T;

      // Token estimation
      const promptTokens = TokenEstimator.estimateTokens(systemInstruction + prompt);
      const candidatesTokens = TokenEstimator.estimateTokens(responseText);
      const tokenUsage: AITokenUsage = {
        promptTokens,
        candidatesTokens,
        totalTokens: promptTokens + candidatesTokens
      };

      // 3. Cache response into IndexedDB
      const ttl = Date.now() + (ttlHours * 60 * 60 * 1000);
      await IDBManager.saveAIResponse({
        promptHash: hash,
        response: responseText,
        createdDate: new Date().toISOString(),
        questionId: options.questionId,
        topic: options.topic,
        ttl
      });

      return {
        success: true,
        data,
        cached: false,
        tokenUsage
      };
    } catch (err: any) {
      console.error("AI Request failed:", err);
      let errMsg = err.message || "Failed to contact Gemini API";
      try {
        if (errMsg.trim().startsWith("{")) {
          const parsed = JSON.parse(errMsg);
          if (parsed?.error?.message) {
            errMsg = parsed.error.message;
          }
        }
      } catch {}
      return {
        success: false,
        error: errMsg,
        cached: false
      };
    }
  }
}
