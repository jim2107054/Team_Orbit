import { createClient, Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { DDL_SCHEMA } from './schema.js';

let dbClient: Client | null = null;

export function getDbClient(): Client {
  if (dbClient) {
    return dbClient;
  }

  const dbDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbUrl = process.env.DATABASE_URL || `file:${path.join(dbDir, 'upay_shield.db')}`;
  
  dbClient = createClient({
    url: dbUrl
  });

  return dbClient;
}

export async function initDatabase(): Promise<void> {
  const db = getDbClient();
  
  // Clean comments and execute individual statements
  const cleanSql = DDL_SCHEMA
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  const statements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    await db.execute(statement);
  }
}
