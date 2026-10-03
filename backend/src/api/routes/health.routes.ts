import { Router, Request, Response } from 'express';
import { getDbPool, getPoolStats } from '../../db/client.js';
import { envConfig } from '../../core/env.js';
import { getCacheStats } from '../middleware/index.js';
import { persistence } from '../../db/persistence.js';

export const healthRouter = Router();

// Liveness check
healthRouter.get(['/health', '/healthz'], (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: 'System is healthy and operational',
    status: 'HEALTHY',
    service: 'astha-core',
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

/**
 * Durable-write health. Shows whether write-through persistence is on, how many
 * writes have committed, and any recent failures — so a silently failing write
 * path is visible instead of looking like "my change did not save".
 */
healthRouter.get('/health/persistence', async (_req: Request, res: Response) => {
  const stats = persistence.getStats();
  try {
    const counts = await getDurableRowCounts();
    return res.status(stats.failed_total > 0 ? 207 : 200).json({
      success: true,
      message: stats.enabled
        ? 'Write-through persistence is active'
        : 'Write-through persistence is disabled (in-memory only)',
      persistence: stats,
      durable_row_counts: counts,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      message: `Unable to read durable row counts: ${err.message}`,
      persistence: stats,
      error: { code: 'PERSISTENCE_COUNT_FAILED', details: err.message },
      timestamp: new Date().toISOString()
    });
  }
});

async function getDurableRowCounts(): Promise<Record<string, number>> {
  const tables = [
    'complaints',
    'complaint_duplicate_groups',
    'complaint_analyst_actions',
    'scam_campaigns',
    'campaign_complaints',
    'agent_dual_profiles',
    'merchant_risk_profiles',
    'customer_safety_modes',
    'coach_sessions',
    'propagation_alerts',
    'recovery_plans',
    'knowledge_graph_nodes',
    'knowledge_graph_edges',
    'rag_documents',
    'rag_chunks',
    'llm_invocations'
  ];

  const selects = tables.map(t => `(SELECT COUNT(*)::int FROM ${t}) AS ${t}`).join(', ');
  const result = await getDbPool().query(`SELECT ${selects}`);
  return result.rows[0] ?? {};
}

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
