import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

// ── In-memory fallback rate limiter ─────────────────────────────────────────
// Used when Upstash Redis is unavailable or misconfigured (e.g. NOPERM error).
// Mirrors the Ratelimit `.limit()` API so the middleware works identically.
class InMemoryRateLimiter {
  private store = new Map<string, { count: number; reset: number }>();
  constructor(private max: number, private windowMs: number) {}

  async limit(key: string) {
    const now = Date.now();
    const entry = this.store.get(key);
    if (!entry || now > entry.reset) {
      this.store.set(key, { count: 1, reset: now + this.windowMs });
      return { success: true, limit: this.max, remaining: this.max - 1, reset: now + this.windowMs };
    }
    entry.count++;
    const remaining = Math.max(0, this.max - entry.count);
    return { success: entry.count <= this.max, limit: this.max, remaining, reset: entry.reset };
  }
}

// ── Decide which limiter to use ─────────────────────────────────────────────
// Try Upstash first; if the env vars are missing or the token lacks permissions,
// fall back to the in-memory implementation.
let apiLimiter: { limit: (key: string) => Promise<{ success: boolean; limit: number; remaining: number; reset: number }> };
let authLimiter: typeof apiLimiter;

const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

if (hasUpstash) {
  try {
    // General API limiter: 100 requests per 10 seconds
    apiLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "10 s"),
      analytics: true,
      prefix: "@upstash/ratelimit/api",
    });

    // Strict Auth limiter: 5 requests per 1 minute (prevent credential stuffing)
    authLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
      prefix: "@upstash/ratelimit/auth",
    });
  } catch {
    console.warn("⚠ Upstash Ratelimit init failed – using in-memory fallback");
    apiLimiter = new InMemoryRateLimiter(100, 10_000);
    authLimiter = new InMemoryRateLimiter(5, 60_000);
  }
} else {
  console.warn("⚠ UPSTASH_REDIS_REST_URL / TOKEN not set – using in-memory rate limiter");
  apiLimiter = new InMemoryRateLimiter(100, 10_000);
  authLimiter = new InMemoryRateLimiter(5, 60_000);
}

export { apiLimiter, authLimiter };
