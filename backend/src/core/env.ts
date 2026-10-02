import dotenv from 'dotenv';
dotenv.config();

export interface AppEnvConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  DATABASE_URL: string;
  FRONTEND_URL: string;
  IS_DATABASE_CONFIGURED: boolean;
}

export function validateAndLoadEnv(): AppEnvConfig {
  const PORT = parseInt(process.env.PORT || '4000', 10);
  const NODE_ENV = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  const DATABASE_URL = process.env.DATABASE_URL || '';
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (!DATABASE_URL) {
    console.warn('⚠️ WARNING: DATABASE_URL environment variable is missing.');
    console.warn('Please configure DATABASE_URL in backend/.env for Neon PostgreSQL connectivity.');
  }

  return {
    PORT,
    NODE_ENV,
    DATABASE_URL,
    FRONTEND_URL,
    IS_DATABASE_CONFIGURED: Boolean(DATABASE_URL && !DATABASE_URL.includes('replace_with_real'))
  };
}

export const envConfig = validateAndLoadEnv();
