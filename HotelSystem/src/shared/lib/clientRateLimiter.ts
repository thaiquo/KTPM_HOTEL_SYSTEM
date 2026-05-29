type ClientRateLimitEntry = {
  lastRequestAt: number;
};

export type ClientRateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
  retryAfterSeconds: number;
};

const requestBuckets = new Map<string, ClientRateLimitEntry>();

export const consumeClientRateLimit = (
  key: string,
  cooldownMs: number,
  now = Date.now(),
): ClientRateLimitResult => {
  const normalizedKey = key.trim().toLowerCase();
  const entry = requestBuckets.get(normalizedKey);

  if (entry) {
    const elapsed = now - entry.lastRequestAt;
    if (elapsed < cooldownMs) {
      const retryAfterMs = cooldownMs - elapsed;
      return {
        allowed: false,
        retryAfterMs,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }
  }

  requestBuckets.set(normalizedKey, { lastRequestAt: now });
  return { allowed: true, retryAfterMs: 0, retryAfterSeconds: 0 };
};

export const clearClientRateLimit = (key: string) => {
  requestBuckets.delete(key.trim().toLowerCase());
};
