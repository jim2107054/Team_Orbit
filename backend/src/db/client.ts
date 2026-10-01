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

  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    max: 20, // Connection pooling (20 concurrent connections)
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });

  return pool;
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
