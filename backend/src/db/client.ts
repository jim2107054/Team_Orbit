import pg from 'pg';
import dotenv from 'dotenv';
import { POSTGRES_DDL_SCHEMA } from './schema.js';

dotenv.config();

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDbPool(): pg.Pool {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;
  const isProduction = process.env.NODE_ENV === 'production';

  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    // ─── Connection Pool Tuning ───────────────────────────
    max: 25,                          // Max concurrent connections (tune per Neon plan)
    min: 5,                           // Keep 5 warm connections ready
    idleTimeoutMillis: 30_000,        // Release idle connections after 30s
    connectionTimeoutMillis: 10_000,  // Fail fast if can't connect in 10s
    maxUses: 7500,                    // Recycle connections after 7500 queries (prevents leaks)
    allowExitOnIdle: false,           // Keep pool alive for server lifetime
    // ─── Statement & Query Tuning ─────────────────────────
    application_name: 'upay-shield-backend',  // Visible in pg_stat_activity
    statement_timeout: isProduction ? 30_000 : 0, // 30s timeout in production
  } as any);

  pool.on('error', (err) => {
    console.error('[DB Pool] Unexpected error on idle client:', err.message);
  });

  pool.on('connect', (client) => {
    // Set session-level optimizations
    client.query('SET timezone = \'UTC\'').catch(() => {});
  });

  return pool;
}

/** Get pool health statistics for monitoring endpoints */
export function getPoolStats(): { total: number; idle: number; waiting: number } {
  const p = getDbPool();
  return {
    total: p.totalCount,
    idle: p.idleCount,
    waiting: p.waitingCount,
  };
}

export async function initDatabase(): Promise<void> {
  const db = getDbPool();
  console.log('Connecting to Neon PostgreSQL and initializing schema...');

  const cleanSql = POSTGRES_DDL_SCHEMA
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  const statements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const client = await db.connect();
  try {
    for (const statement of statements) {
      await client.query(statement);
    }
    console.log('Neon PostgreSQL tables and composite indexes initialized successfully.');
  } finally {
    client.release();
  }
}
