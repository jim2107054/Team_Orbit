import { Request, Response, NextFunction } from 'express';

/**
 * In-memory sliding-window rate limiter.
 * Production upgrade path: swap to Redis-backed limiter (e.g. `rate-limiter-flexible`).
 */

interface WindowEntry {
  count: number;
  resetAt: number;
}

const windows = new Map<string, WindowEntry>();

// Cleanup stale entries every 60 seconds to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of windows) {
    if (entry.resetAt < now) {
      windows.delete(key);
    }
  }
}, 60_000);

export interface RateLimitConfig {
  windowMs: number;    // Time window in ms
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: Request) => string;
}

export function rateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests, keyGenerator } = config;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator
      ? keyGenerator(req)
      : (req.ip || req.headers['x-forwarded-for'] as string || 'unknown');

    const now = Date.now();
    const entry = windows.get(key);

    if (!entry || entry.resetAt < now) {
      // New window
      windows.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
      return next();
    }

    if (entry.count >= maxRequests) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        error: { code: 'RATE_LIMIT_EXCEEDED', retry_after_seconds: retryAfterSec }
      });
      return;
    }

    entry.count++;
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - entry.count);
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));
    next();
  };
}

/** Pre-configured limiters for different endpoint categories */
export const apiRateLimiter = rateLimiter({
  windowMs: 60_000,   // 1 minute
  maxRequests: 120     // 120 req/min per IP (generous for dashboard polling)
});

export const scoringRateLimiter = rateLimiter({
  windowMs: 60_000,
  maxRequests: 60      // 60 scoring requests/min per IP
});

export const authRateLimiter = rateLimiter({
  windowMs: 900_000,   // 15 minutes
  maxRequests: 10       // 10 login attempts per 15 min
});
