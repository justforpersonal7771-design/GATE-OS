/**
 * Rejects requests whose Origin/Referer is PRESENT and points somewhere else — i.e. this
 * blocks cross-site fetches (another website's JS calling this API, which browsers force
 * to carry an Origin header naming that other site) without blocking requests that
 * legitimately omit the header.
 *
 * Deliberately permissive when the header is missing entirely, rather than blocking by
 * default: this app's offline/PWA support (a non-negotiable architectural requirement) is
 * powered by the Service Worker precaching these same API routes, and SW-internal fetch()
 * calls are not guaranteed across browsers to carry Origin/Referer the same way a page's
 * own fetch does. Blocking on "header absent" risks silently breaking offline installs to
 * close a gap that a plain `curl` (no headers at all) would still slip through anyway —
 * not a trade worth making. This still blocks the real cross-site-embedding case and,
 * combined with rate limiting, is the intended "raise the bar" layer, not a hard wall.
 */
export function isCrossOriginRequest(request: Request): boolean {
  const host = request.headers.get("host");
  if (!host) return false;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const candidate = origin || referer;
  if (!candidate) return false; // absent — permissive, see above

  try {
    const candidateHost = new URL(candidate).host;
    return candidateHost !== host;
  } catch {
    return false;
  }
}
