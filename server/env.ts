import z from "zod";
import "dotenv/config";
import { config } from "dotenv";
import path from 'path'
console.log(path.resolve(process.cwd(), '../.env'))
config({ path: path.resolve(process.cwd(), '../.env') })
config({ path: path.resolve(process.cwd(), '../.env.local') })

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  RESEND_KEY: z.string()
});

export const ENV = envSchema.parse({
  RESEND_KEY: process.env.RESEND_KEY
});
