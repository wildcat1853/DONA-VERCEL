import z from "zod";
import "dotenv/config";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  ASSISTANT_ID: z.string(),
  GOOGLE_ID: z.string(),
  GOOGLE_SECRET: z.string(),
  OPENAI_API_KEY: z.string(),
});

export const ENV = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  ASSISTANT_ID: process.env.ASSISTANT_ID,
  GOOGLE_ID: process.env.GOOGLE_ID,
  GOOGLE_SECRET: process.env.GOOGLE_SECRET,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
});
