import z from "zod";
import "dotenv/config";
import { config } from "dotenv";
import path from 'path'
config({ path: path.resolve(process.cwd(), '../.env') })
config({ path: path.resolve(process.cwd(), '../.env.local') })

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  ASSISTANT_ID: z.string(),
  GOOGLE_ID: z.string(),
  GOOGLE_SECRET: z.string(),
  OPENAI_API_KEY: z.string(),
  RESEND_KEY: z.string()
});

export const ENV = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  ASSISTANT_ID: process.env.ASSISTANT_ID,
  GOOGLE_ID: process.env.GOOGLE_ID,
  GOOGLE_SECRET: process.env.GOOGLE_SECRET,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  RESEND_KEY: process.env.RESEND_KEY
});
