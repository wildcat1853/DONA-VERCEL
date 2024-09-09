import { ENV } from "./env";
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "postgresql",
  schema: "./schemas.ts",
  out: "./drizzle",
  dbCredentials: {
    url: ENV.DATABASE_URL,
  },
});
