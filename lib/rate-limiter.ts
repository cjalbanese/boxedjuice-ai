const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_REQUESTS = 20;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

function getEntry(ip: string): RateLimitEntry {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now >= entry.resetAt) {
    const fresh = { count: 0, resetAt: now + WINDOW_MS };
    store.set(ip, fresh);
    return fresh;
  }

  return entry;
}

export function getRemaining(ip: string): number {
  const entry = getEntry(ip);
  return Math.max(0, MAX_REQUESTS - entry.count);
}

export function consume(ip: string): boolean {
  const entry = getEntry(ip);
  if (entry.count >= MAX_REQUESTS) return false;
  entry.count++;
  return true;
}

export function checkLimit(ip: string): { allowed: boolean; remaining: number } {
  const entry = getEntry(ip);
  return {
    allowed: entry.count < MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - entry.count),
  };
}
