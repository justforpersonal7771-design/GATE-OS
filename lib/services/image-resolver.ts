/**
 * Image Resolver Service
 * 
 * Maps structural image tokens from the question bank to actual filesystem URLs.
 * Example Tokens:
 * [IMAGE_Q_02_1] -> /images/2026-FN/2.png
 * [IMAGE_Q_02_A] -> /images/2026-FN/2_A.png
 */

export interface ResolvableImage {
  originalToken: string;
  resolvedUrl: string | null;
  resolvedUrls?: string[];
  hasError: boolean;
  errorMessage?: string;
}

export class ImageResolver {
  private static readonly FALLBACK_URL = "/images/fallbacks/missing-image.png";
  private static manifest: Record<string, string[]> | null = null;

  public static initialize(manifestData: Record<string, string[]>) {
    this.manifest = manifestData;
  }

  public static getManifest() {
    return this.manifest;
  }

  public static resolveToken(token: string, yearShift: string, imagesRequired?: string[]): ResolvableImage {
    if (!this.manifest) {
      console.warn("ImageResolver not initialized with manifest");
      return {
        originalToken: token,
        resolvedUrl: this.FALLBACK_URL,
        hasError: true,
        errorMessage: "Manifest not loaded"
      };
    }

    try {
      const cleanToken = token.replace(/[[\]]/g, "").trim();

      const parts = cleanToken.split("_");
      if (parts.length < 3 || parts[0] !== "IMAGE" || parts[1] !== "Q") {
        throw new Error(`Malformed image token: ${token}`);
      }

      const qNumStr = parts[2];
      const qNum = parseInt(qNumStr, 10);
      if (isNaN(qNum)) {
        throw new Error(`Invalid question number in token: ${token}`);
      }

      const suffix = parts.length > 3 ? parts.slice(3).join("_") : "";
      const targetSuffix = suffix.toLowerCase();
      const availableImages = this.manifest[yearShift] || [];

      // Helper to parse filename structure
      const parseFilename = (f: string) => {
        const lastDot = f.lastIndexOf(".");
        const base = lastDot !== -1 ? f.substring(0, lastDot) : f;
        const fileParts = base.split("_");
        const fileQNum = parseInt(fileParts[0], 10);
        const fileSuffix = fileParts.slice(1).join("_").toLowerCase();
        return { fileQNum, fileSuffix };
      };

      // Determine single vs multi image logic
      let resolvedUrls: string[] = [];
      let resolvedUrl: string | null = null;

      if (targetSuffix === "1" || targetSuffix === "") {
        // If this question requires other numbered images (e.g., IMAGE_Q_09_2, IMAGE_Q_09_3),
        // we should ONLY resolve strictly to the '1' image to avoid duplication.
        const hasOtherNumberedImages = (imagesRequired || []).some(
          req => {
            const reqClean = req.replace(/[[\]]/g, "").trim();
            const reqParts = reqClean.split("_");
            if (reqParts.length < 3) return false;
            const reqQNum = parseInt(reqParts[2], 10);
            const reqSuffix = reqParts.slice(3).join("_").toLowerCase();

            return reqQNum === qNum &&
              reqClean !== cleanToken &&
              reqSuffix !== "a" &&
              reqSuffix !== "b" &&
              reqSuffix !== "c" &&
              reqSuffix !== "d" &&
              reqSuffix !== "q";
          }
        );

        if (!hasOtherNumberedImages) {
          // It's the ONLY numbered token for this question in the text!
          // We must grab ALL _1, _2, _3 images for this question OR the flat image
          const matchedFiles = availableImages.filter(f => {
            const parsed = parseFilename(f);
            return parsed.fileQNum === qNum && (parsed.fileSuffix === "" || /^\d+$/.test(parsed.fileSuffix));
          });
          if (matchedFiles.length > 0) {
            // Sort to ensure sequence (e.g. 9_1.png, 9_2.png)
            matchedFiles.sort();
            resolvedUrls = matchedFiles.map(f => `/images/${yearShift}/${f}`);
            resolvedUrl = resolvedUrls[0];
          }
        } else {
          // There are multiple numbered tokens explicitly placed in text (e.g. Q43)
          // We look exactly for _1 or the fallback flat image
          const exactFile = availableImages.find(f => {
            const parsed = parseFilename(f);
            return parsed.fileQNum === qNum && (parsed.fileSuffix === "1" || parsed.fileSuffix === "");
          });
          if (exactFile) {
            resolvedUrl = `/images/${yearShift}/${exactFile}`;
            resolvedUrls = [resolvedUrl];
          }
        }
      } else {
        // For _A, _B, _C, _D, _Q or _2, _3, we match exactly
        const exactFile = availableImages.find(f => {
          const parsed = parseFilename(f);
          return parsed.fileQNum === qNum && parsed.fileSuffix === targetSuffix;
        });
        if (exactFile) {
          resolvedUrl = `/images/${yearShift}/${exactFile}`;
          resolvedUrls = [resolvedUrl];
        }
      }

      let hasError = false;

      if (!resolvedUrl) {
        // Fallback if not found in manifest
        const fallbackSuffix = (targetSuffix === "1" || targetSuffix === "") ? "" : `_${suffix}`;
        const fallbackName = `${qNumStr}${fallbackSuffix}.png`;
        resolvedUrl = `/images/${yearShift}/${fallbackName}`;
        resolvedUrls = [resolvedUrl];
        hasError = true; // Not strictly known to exist, so flag as missing/error
      }

      return {
        originalToken: token,
        resolvedUrl,
        resolvedUrls,
        hasError,
      };

    } catch (error: any) {
      console.warn("[ImageResolver]", error.message);
      return {
        originalToken: token,
        resolvedUrl: this.FALLBACK_URL,
        resolvedUrls: [this.FALLBACK_URL],
        hasError: true,
        errorMessage: error.message,
      };
    }
  }

  public static getSafeUrl(token: string, yearShift: string, imagesRequired?: string[]): string {
    const result = this.resolveToken(token, yearShift, imagesRequired);
    return result.resolvedUrl || this.FALLBACK_URL;
  }
}
