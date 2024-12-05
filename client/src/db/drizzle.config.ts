import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import path from 'path';

// Explicitly load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set in environment variables");
}

export default defineConfig({
    dialect: "postgresql",
    schema: "./schemas.ts",
    out: "./drizzle",
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
});
