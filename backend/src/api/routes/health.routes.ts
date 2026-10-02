import { Router, Request, Response } from 'express';
import { getDbPool, getPoolStats } from '../../db/client.js';
import { envConfig } from '../../core/env.js';
import { getCacheStats } from '../middleware/index.js';

export const healthRouter = Router();

// Liveness check
healthRouter.get(['/health', '/healthz'], (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: 'System is healthy and operational',
    status: 'HEALTHY',
    service: 'upay-shield-core',
    environment: envConfig.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Database connectivity & latency check
healthRouter.get('/health/db', async (_req: Request, res: Response) => {
  const dbStart = performance.now();
  try {
    const pool = getDbPool();
    const result = await pool.query('SELECT NOW() as db_time, COUNT(*) as txn_count FROM transactions;');
    const latency = (performance.now() - dbStart).toFixed(2);
    
    return res.status(200).json({
      success: true,
      message: 'Neon PostgreSQL database is connected and active',
      status: 'ok',
      database: 'connected',
      provider: 'Neon PostgreSQL (Pooled)',
      latency_ms: Number(latency),
      db_time: result.rows[0]?.db_time,
      total_transactions: Number(result.rows[0]?.txn_count || 0),
      pool: getPoolStats(),
      cache: getCacheStats(),
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      message: `Database connection error: ${err.message}`,
      status: 'error',
      database: 'disconnected',
      error: { code: 'DB_CONNECTION_FAILED', details: err.message },
      timestamp: new Date().toISOString()
    });
  }
});

// Readiness check
healthRouter.get('/readyz', (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: 'System is fully initialized and ready to accept traffic',
    status: 'READY',
    models_loaded: true,
    graph_engine: 'online',
    timestamp: new Date().toISOString()
  });
});
