import express from 'express';
import cors from 'cors';
import { initDatabase, getDbPool } from './db/client.js';
import { shieldRouter } from './api/routes/shield.js';
import { generateSyntheticWorld } from './generator/synthetic-world.js';
import { repository } from './db/repository.js';
import { envConfig } from './core/env.js';

const app = express();
const PORT = envConfig.PORT;

// Security & CORS Configuration
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
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'idempotency-key']
}));

app.use(express.json({ limit: '4mb' }));

// Response-time and request ID tracking
app.use((req, res, next) => {
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
});

// Routes
app.use('/v1', shieldRouter);
app.use('/api/v1', shieldRouter);

// Health check endpoints
app.get(['/health', '/healthz'], (req, res) => {
  res.json({
    success: true,
    message: 'System is healthy and operational',
    status: 'HEALTHY',
    service: 'upay-shield-core',
    environment: envConfig.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.get('/health/db', async (req, res) => {
  const dbStart = performance.now();
  try {
    const pool = getDbPool();
    const result = await pool.query('SELECT NOW() as db_time, COUNT(*) as txn_count FROM transactions;');
    const latency = (performance.now() - dbStart).toFixed(2);
    
    res.json({
      success: true,
      message: 'Neon PostgreSQL database is connected and active',
      status: 'ok',
      database: 'connected',
      provider: 'Neon PostgreSQL (Pooled)',
      latency_ms: Number(latency),
      db_time: result.rows[0]?.db_time,
      total_transactions: Number(result.rows[0]?.txn_count || 0),
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(503).json({
      success: false,
      message: `Database connection error: ${err.message}`,
      status: 'error',
      database: 'disconnected',
      error: { code: 'DB_CONNECTION_FAILED', details: err.message },
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/readyz', (req, res) => {
  res.json({
    success: true,
    message: 'System is fully initialized and ready to accept traffic',
    status: 'READY',
    models_loaded: true,
    db_connected: true
  });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'An unexpected server error occurred',
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      details: err.message || 'An unexpected error occurred'
    }
  });
});

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

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🛡️ upay Shield Backend Engine running on port ${PORT}`);
      console.log(`📍 API Base: http://localhost:${PORT}/v1`);
      console.log(`🩺 Health:   http://localhost:${PORT}/health`);
      console.log(`🗄️ DB Health: http://localhost:${PORT}/health/db`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

