import { Request, Response, NextFunction } from 'express';
import { persistence } from '../../db/persistence.js';
import { invalidateCache } from './cache.js';

/**
 * Commits queued domain writes before the response leaves the server, and drops
 * the read cache so the next GET cannot serve a pre-write snapshot.
 *
 * Domain services mutate memory synchronously and queue their durable write (see
 * db/persistence.ts). Without this middleware those writes would sit in the
 * queue and a client could read its own stale data back — or lose the write
 * entirely on shutdown. Flushing here means a 2xx response is also a commit
 * acknowledgement.
 */
export function persistenceFlush(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET' || req.method === 'OPTIONS') {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = function (body: any): Response {
    const isSuccess = res.statusCode >= 200 && res.statusCode < 300;

    persistence
      .flush()
      .then(result => {
        if (isSuccess && (result.committed > 0 || result.failed > 0)) {
          // Any committed write can change what the cached list endpoints would
          // return, and the cache is keyed by URL with no knowledge of domains.
          invalidateCache('');
        }
        if (result.failed > 0) {
          res.setHeader('X-Persistence-Failed', String(result.failed));
        }
        originalJson(body);
      })
      .catch(err => {
        console.error('[Persistence] flush failed:', err?.message || err);
        res.setHeader('X-Persistence-Failed', 'flush-error');
        originalJson(body);
      });

    return res;
  } as Response['json'];

  next();
}
