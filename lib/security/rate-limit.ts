type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitPolicy = {
  max: number;
  windowMs: number;
};

const bucket = new Map<string, RateLimitEntry>();

function now() {
  return Date.now();
}

function cleanup() {
  const current = now();
  for (const [key, value] of bucket.entries()) {
    if (value.resetAt <= current) {
      bucket.delete(key);
    }
  }
}

export function consumeRateLimit(key: string, policy: RateLimitPolicy) {
  cleanup();

  const current = now();
  const existing = bucket.get(key);

  if (!existing || existing.resetAt <= current) {
    const next: RateLimitEntry = {
      count: 1,
      resetAt: current + policy.windowMs
    };
    bucket.set(key, next);

    return {
      limited: false,
      limit: policy.max,
      remaining: Math.max(0, policy.max - next.count),
      resetAt: next.resetAt
    };
  }

  existing.count += 1;
  bucket.set(key, existing);

  return {
    limited: existing.count > policy.max,
    limit: policy.max,
    remaining: Math.max(0, policy.max - existing.count),
    resetAt: existing.resetAt
  };
}

export function resolvePolicy(pathname: string): RateLimitPolicy | null {
  if (pathname.startsWith('/api/stripe/webhook')) {
    return null;
  }

  if (pathname.startsWith('/api/widget/')) {
    return { max: 300, windowMs: 60_000 };
  }

  if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/register')) {
    return { max: 12, windowMs: 60_000 };
  }

  if (pathname.startsWith('/api/chatbot/message')) {
    return { max: 120, windowMs: 60_000 };
  }

  if (pathname.startsWith('/api/billing/checkout')) {
    return { max: 20, windowMs: 60_000 };
  }

  if (pathname.startsWith('/api/')) {
    return { max: 180, windowMs: 60_000 };
  }

  return null;
}
