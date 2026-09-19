import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { checkRateLimit, getClientKey } from "@/lib/security/rate-limiter";
import { isCrossOriginRequest } from "@/lib/security/origin-check";

export const runtime = "nodejs";

const DATA_PATH = path.join(process.cwd(), "data", "Aggregated_Output.json");

// The question repository fetches this exactly once per app load (then caches in
// IndexedDB), so a real user session needs at most a handful of requests. This limit is
// sized to comfortably cover that plus retries, while still blocking a scripted loop.
const RATE_LIMIT = { limit: 20, windowMs: 60_000 };

export async function GET(req: NextRequest) {
  if (isCrossOriginRequest(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clientKey = getClientKey(req);
  const { allowed } = checkRateLimit(`dataset:${clientKey}`, RATE_LIMIT);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    // Re-serialize (no pretty-printing) rather than streaming the file as-is — keeps the
    // wire format minified regardless of how the source file on disk is formatted.
    const data = JSON.parse(raw);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("Failed to serve dataset:", err);
    return NextResponse.json({ error: "Failed to load dataset" }, { status: 500 });
  }
}
