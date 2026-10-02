import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err);
  
  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'production' ? undefined : err.stack
    }
  });
}
