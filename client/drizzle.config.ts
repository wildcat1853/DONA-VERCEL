import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Check for Vercel-specific postgres URLs first
const connectionString = 
  process.env.POSTGRES_URL || 
  process.env.POSTGRES_PRISMA_URL || 
  process.env.POSTGRES_URL_NON_POOLING || 
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('No database connection string available');
}

export default defineConfig({
  schema: "./src/db/schemas.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE || 'postgres',
    ssl: process.env.POSTGRES_SSL === 'true'
  },
  verbose: true,
  strict: true,
}); 