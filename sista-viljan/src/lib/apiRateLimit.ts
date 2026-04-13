/**
 * Best-effort in-process sliding-window rate limit (per server instance).
 * For distributed protection under heavy or multi-IP abuse, add Upstash/Vercel KV later.
 */

const buckets = new Map<string, number[]>();

function prune(ts: number[], now: number, windowMs: number): number[] {
  const cutoff = now - windowMs;
  return ts.filter((t) => t > cutoff);
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

function envMs(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1000 ? n : fallback;
}

export const RATE_AI = {
  get max() {
    return envInt("API_RATE_LIMIT_AI_MAX", 45);
  },
  get windowMs() {
    return envMs("API_RATE_LIMIT_AI_WINDOW_MS", 60_000);
  },
};

export const RATE_START_WILL = {
  get max() {
    return envInt("API_RATE_LIMIT_START_WILL_MAX", 20);
  },
  get windowMs() {
    return envMs("API_RATE_LIMIT_START_WILL_WINDOW_MS", 60_000);
  },
};

export const RATE_CLAUDE = {
  get max() {
    return envInt("API_RATE_LIMIT_CLAUDE_MAX", 25);
  },
  get windowMs() {
    return envMs("API_RATE_LIMIT_CLAUDE_WINDOW_MS", 60_000);
  },
};

/** Returns true if the request is allowed (slot consumed). */
export function takeRateSlot(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const prev = buckets.get(key) ?? [];
  const ts = prune(prev, now, windowMs);
  if (ts.length >= max) {
    buckets.set(key, ts);
    return false;
  }
  ts.push(now);
  buckets.set(key, ts);
  return true;
}
