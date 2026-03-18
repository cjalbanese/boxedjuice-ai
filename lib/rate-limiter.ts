import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const MAX_REQUESTS = 20;

const redis = Redis.fromEnv();

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(MAX_REQUESTS, "24 h"),
  prefix: "boxedjuice",
});

/** Read-only check — does NOT consume a request. */
export async function getRemaining(ip: string): Promise<number> {
  const { remaining } = await ratelimit.getRemaining(ip);
  return remaining;
}

/**
 * Check + consume atomically. Returns whether the request is allowed
 * and how many requests remain after this one.
 */
export async function checkAndConsume(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const { success, remaining } = await ratelimit.limit(ip);
  return { allowed: success, remaining };
}
