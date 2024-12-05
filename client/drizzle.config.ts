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
  driver: 'pg',
  dbCredentials: {
    connectionString: connectionString,
  },
  verbose: true, // Add this to help debug connection issues
  strict: true,  // Enforce schema validation
}); 