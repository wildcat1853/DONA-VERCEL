import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: '.env.local' });

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

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
}); 