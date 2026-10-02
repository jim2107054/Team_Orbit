import express from 'express';
import cors from 'cors';
import { initDatabase, getDbPool } from './db/client.js';
import { shieldRouter, healthRouter } from './api/routes/index.js';
import { requestLogger, errorHandler } from './api/middleware/index.js';
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

// Response-time and request ID tracking middleware
app.use(requestLogger);

// Health check routes at root
app.use(healthRouter);

// Main API routes with version prefixes
app.use('/v1', shieldRouter);
app.use('/api/v1', shieldRouter);

// Global Error Handler middleware
app.use(errorHandler);

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

