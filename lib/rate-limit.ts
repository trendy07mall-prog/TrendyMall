// First rate limiter in this codebase -- no existing helper to build on.
// Deliberately basic: an in-memory Map of request timestamps keyed by
// caller (e.g. IP), correct as long as this runs as a single persistent
// Node process (this app's actual deploy shape, `next start`, not
// ephemeral serverless functions where in-memory state wouldn't survive
// between requests). Good enough alongside the honeypot for a low-traffic
// contact form; not meant as a general-purpose primitive for
// high-value/high-abuse endpoints.
const requestLog = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number },
): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= max) {
    requestLog.set(key, timestamps);
    return false;
  }

  timestamps.push(now);
  requestLog.set(key, timestamps);
  return true;
}
