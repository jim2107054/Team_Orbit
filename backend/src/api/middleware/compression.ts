import { Request, Response, NextFunction } from 'express';
import { createGzip, createDeflate } from 'zlib';
import { PassThrough } from 'stream';

/**
 * Lightweight gzip/deflate compression middleware.
 * 
 * Only compresses responses larger than the threshold (1KB default).
 * Respects Accept-Encoding headers and sets proper Content-Encoding.
 */

export interface CompressionConfig {
  threshold?: number;  // Min response size in bytes to compress (default: 1024)
}

export function compression(config: CompressionConfig = {}) {
  const threshold = config.threshold ?? 1024;

  return (req: Request, res: Response, next: NextFunction): void => {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    // Skip if client doesn't accept compression
    if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('deflate')) {
      return next();
    }

    // Intercept the json method for API responses
    const originalJson = res.json.bind(res);
    res.json = function(body: any) {
      const jsonString = JSON.stringify(body);
      
      // Skip compression for small payloads
      if (jsonString.length < threshold) {
        return originalJson(body);
      }

      const encoding = acceptEncoding.includes('gzip') ? 'gzip' : 'deflate';
      const compressor = encoding === 'gzip' ? createGzip() : createDeflate();

      res.setHeader('Content-Encoding', encoding);
      res.setHeader('Content-Type', 'application/json');
      res.removeHeader('Content-Length'); // Length changes after compression
      res.setHeader('Vary', 'Accept-Encoding');

      const input = new PassThrough();
      input.end(jsonString);
      input.pipe(compressor).pipe(res as any);

      return res;
    } as any;

    next();
  };
}

export const apiCompression = compression({ threshold: 1024 });
