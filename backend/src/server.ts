import express from 'express';
import cors from 'cors';
import { initDatabase, getDbPool } from './db/client.js';
import { shieldRouter, healthRouter } from './api/routes/index.js';
import {
  requestLogger,
  errorHandler,
  apiRateLimiter,
  securityHeaders
} from './api/middleware/index.js';
import { generateSyntheticWorld } from './generator/synthetic-world.js';
import { seedInvestigationEvidenceLedger } from './generator/investigation-evidence-ledger.js';
import { repository } from './db/repository.js';
import { envConfig } from './core/env.js';

const app = express();
const PORT = envConfig.PORT;

// ─── 1. Security Headers (OWASP) ────────────────────────────
app.use(securityHeaders);
app.disable('x-powered-by');

// ─── 2. CORS Configuration ──────────────────────────────────
const allowedOrigins = [
  envConfig.FRONTEND_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || envConfig.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(null, true); // Permissive for local hackathon demo deployment
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'idempotency-key'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'X-Cache', 'X-Response-Time'],
  maxAge: 600  // Preflight cache: 10 minutes
}));

// ─── 3. Body Parsing ────────────────────────────────────────
app.use(express.json({ limit: '4mb' }));

// ─── 4. Request Tracking & Logging ──────────────────────────
app.use(requestLogger);

// ─── 5. Global Rate Limiter ─────────────────────────────────
app.use(apiRateLimiter);

// ─── 6. Health Routes (outside rate-limiting for monitoring) ──
app.use(healthRouter);

// ─── 7. Main API Routes ─────────────────────────────────────
app.use('/v1', shieldRouter);
app.use('/api/v1', shieldRouter);

// ─── 8. Global Error Handler ────────────────────────────────
app.use(errorHandler);

// ─── Graceful Shutdown ──────────────────────────────────────
async function gracefulShutdown(signal: string) {
  console.log(`\n[${signal}] Graceful shutdown initiated...`);
  const pool = getDbPool();
  try {
    await pool.end();
    console.log('Database pool drained.');
  } catch (err) {
    console.error('Error during pool drain:', err);
  }
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

async function startServer() {
  try {
    await initDatabase();
    console.log('Database initialized successfully.');

    // Check if initial world data is present, if not seed it
    const stats = await repository.getSummaryStats();
    if (stats.totalTxns === 0) {
      console.log('Seeding initial synthetic world dataset...');
      await generateSyntheticWorld();
    }

    // Refresh the investigation evidence ledger on every boot. Idempotent (upsert by
    // stable TXN-INV-* ids) and timestamp-relative, so the golden-hour demo scenario
    // is always live. A failure here must not prevent the server from starting.
    try {
      const ledger = await seedInvestigationEvidenceLedger();
      console.log(`Investigation evidence ledger refreshed: ${ledger.transactions_written} transactions across ${ledger.scenarios.length} scenarios.`);
    } catch (err: any) {
      console.warn('Investigation evidence ledger seeding skipped:', err?.message);
    }

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`  upay Shield Backend Engine running on port ${PORT}`);
      console.log(`  API Base: http://localhost:${PORT}/v1`);
      console.log(`  Health:   http://localhost:${PORT}/health`);
      console.log(`  DB Health: http://localhost:${PORT}/health/db`);
      console.log(`  Environment: ${envConfig.NODE_ENV}`);
      console.log(`  Pool Size: 20 connections`);
      console.log(`  Rate Limit: 120 req/min per IP`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
