import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { checkRateLimit, getClientKey } from "@/lib/security/rate-limiter";
import { isCrossOriginRequest } from "@/lib/security/origin-check";

export const runtime = "nodejs";

const MANIFEST_PATH = path.join(process.cwd(), "data", "image-manifest.json");

const RATE_LIMIT = { limit: 20, windowMs: 60_000 };

export async function GET(req: NextRequest) {
  if (isCrossOriginRequest(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clientKey = getClientKey(req);
  const { allowed } = checkRateLimit(`image-manifest:${clientKey}`, RATE_LIMIT);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const raw = await fs.readFile(MANIFEST_PATH, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("Failed to serve image manifest:", err);
    return NextResponse.json({ error: "Failed to load image manifest" }, { status: 500 });
  }
}
