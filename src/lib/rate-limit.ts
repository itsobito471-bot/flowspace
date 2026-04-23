import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

// General API limiter: 100 requests per 10 seconds
export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "10 s"),
  analytics: true,
  prefix: "@upstash/ratelimit/api",
});

// Strict Auth limiter: 5 requests per 1 minute (prevent credential stuffing)
export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: true,
  prefix: "@upstash/ratelimit/auth",
});
