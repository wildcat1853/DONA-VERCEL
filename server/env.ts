import z from "zod";
import "dotenv/config";


const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  RESEND_KEY: z.string()
});

export const ENV = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  RESEND_KEY: process.env.RESEND_KEY
});
