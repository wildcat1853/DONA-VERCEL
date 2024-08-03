import z from 'zod';
import "dotenv/config"

const envSchema = z.object({
    DATABASE_URL: z.string().url()
});

export const ENV = envSchema.parse(process.env);