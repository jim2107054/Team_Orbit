import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = performance.now();
  const reqId = (req.headers['x-request-id'] as string) || `req-${Math.random().toString(36).slice(2, 9)}`;
  res.setHeader('x-request-id', reqId);
  
  const originalWriteHead = res.writeHead.bind(res);
  res.writeHead = function(statusCode: number, ...args: any[]) {
    const duration = (performance.now() - start).toFixed(2);
    res.setHeader('x-response-time', `${duration}ms`);
    return (originalWriteHead as any)(statusCode, ...args);
  };

  next();
}
