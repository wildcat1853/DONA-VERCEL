// lib/db.ts

import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import { project, task, message } from "./schemas";
import * as schema from "./schemas";
import { config } from "dotenv";
import path from 'path'

// Only load .env in development
if (process.env.NODE_ENV === 'development') {
  config({ path: path.resolve(process.cwd(), '../.env') });
}

// Use POSTGRES_URL in production (Vercel), fallback to DATABASE_URL in development
if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  throw new Error('No database connection string available');
}

// Vercel automatically sets POSTGRES_URL in production
export const db = drizzle(sql, { schema });
export { project, task, message };
