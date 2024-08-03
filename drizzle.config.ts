import { ENV } from "@/lib/env";
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/schemas.ts", 
  out: "./drizzle",
  dbCredentials: {
    url: ENV.DATABASE_URL
  },
});