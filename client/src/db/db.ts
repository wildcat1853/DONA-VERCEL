// lib/db.ts

import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from "./schemas";

// Check for any available database URL
const dbUrl = process.env.POSTGRES_URL || 
              process.env.POSTGRES_PRISMA_URL || 
              process.env.POSTGRES_URL_NON_POOLING;

if (!dbUrl) {
  console.error('No database URL found. Available env vars:', {
    hasPostgresUrl: !!process.env.POSTGRES_URL,
    hasPostgresPrismaUrl: !!process.env.POSTGRES_PRISMA_URL,
    hasPostgresNonPoolingUrl: !!process.env.POSTGRES_URL_NON_POOLING
  });
  throw new Error('Database configuration is missing');
}

// Add this check to verify database connection
const checkConnection = async () => {
  try {
    await sql`SELECT 1`;
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

// Run the check in non-production environments
if (process.env.NODE_ENV !== 'production') {
  checkConnection();
}

export const db = drizzle(sql, { schema });
export * from "./schemas";
