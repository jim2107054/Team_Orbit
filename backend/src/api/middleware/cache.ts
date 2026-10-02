import { Request, Response, NextFunction } from 'express';

/**
 * In-memory API response cache with TTL-based expiry.
 * 
 * Designed for read-heavy dashboard endpoints (summary stats, lists, graphs).
 * Responses are cached by URL path + query string.
 * 
 * Production upgrade path: swap to Redis for multi-instance deployments.
 */

interface CacheEntry {
  body: any;
  statusCode: number;
  headers: Record<string, string>;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

// Purge expired entries every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt < now) {
      cache.delete(key);
    }
  }
}, 30_000);

export interface CacheConfig {
  ttlMs: number;             // Cache TTL in milliseconds
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;  // Skip caching if returns false
}

export function responseCache(config: CacheConfig) {
  const { ttlMs, keyGenerator, condition } = config;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip if condition says so
    if (condition && !condition(req)) {
      return next();
    }

    const cacheKey = keyGenerator ? keyGenerator(req) : req.originalUrl;
    const cached = cache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      // Cache HIT
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-TTL', Math.ceil((cached.expiresAt - now) / 1000));
      for (const [header, value] of Object.entries(cached.headers)) {
        res.setHeader(header, value);
      }
      res.status(cached.statusCode).json(cached.body);
      return;
    }

    // Cache MISS — intercept the response
    res.setHeader('X-Cache', 'MISS');

    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, {
          body,
          statusCode: res.statusCode,
          headers: {
            'content-type': 'application/json'
          },
          expiresAt: now + ttlMs
        });
      }
      return originalJson(body);
    } as any;

    next();
  };
}

/** Invalidate cache entries matching a prefix */
export function invalidateCache(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix) || key.includes(prefix)) {
      cache.delete(key);
    }
  }
}

/** Get cache statistics for monitoring */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}

/** Pre-configured cache middlewares */
export const dashboardCache = responseCache({ ttlMs: 15_000 });   // 15s for dashboard stats
export const listCache = responseCache({ ttlMs: 30_000 });         // 30s for list endpoints
export const heavyQueryCache = responseCache({ ttlMs: 60_000 });   // 60s for expensive queries (rings, graphs)
