import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db/client.js';
import { shieldRouter } from './api/routes/shield.js';
import { generateSyntheticWorld } from './generator/synthetic-world.js';
import { repository } from './db/repository.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security & API Optimization Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'idempotency-key']
}));

app.use(express.json({ limit: '2mb' }));

// Response-time and request ID tracking
app.use((req, res, next) => {
  const start = performance.now();
  const reqId = (req.headers['x-request-id'] as string) || `req-${Math.random().toString(36).slice(2, 9)}`;
  res.setHeader('x-request-id', reqId);
  
  // Hook writeHead to inject latency header before output starts
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
app.get('/healthz', (req, res) => {
  res.json({ status: 'HEALTHY', timestamp: new Date().toISOString(), service: 'upay-shield-core' });
});

app.get('/readyz', (req, res) => {
  res.json({ status: 'READY', models_loaded: true, db_connected: true });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred'
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
      console.log(`🩺 Healthz:  http://localhost:${PORT}/healthz`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
