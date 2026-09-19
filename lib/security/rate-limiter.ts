/**
 * Simple in-memory sliding-window rate limiter for API routes.
 *
 * Honest limitation: on serverless platforms (Vercel), this Map lives in one function
 * instance's memory — under real concurrent traffic across multiple cold-started
 * instances, a determined caller can get more than `limit` requests through by hitting
 * different instances. This is not a substitute for real per-account rate limiting once
 * auth exists. What it DOES reliably stop, at zero cost: a single script looping requests
 * against a warm instance, which covers the realistic "casual bulk scrape" case this is
 * meant to deter.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

// Periodically drop stale buckets so this doesn't grow unbounded over a long-running instance.
const MAX_BUCKETS = 5000;

export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    if (buckets.size > MAX_BUCKETS) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey) buckets.delete(oldestKey);
    }
    return { allowed: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count };
}

/** Best-effort client identifier from request headers (no auth yet, so IP is all we have). */
export function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
