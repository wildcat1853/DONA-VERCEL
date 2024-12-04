// lib/db.ts

import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import { project, task, message } from "./schemas";
import * as schema from "./schemas";
import { config } from "dotenv";
import path from 'path'
if (process.env.NODE_ENV == 'development')
  config({ path: path.resolve(process.cwd(), '../.env') })

export const db = drizzle(sql, { schema });
export { project, task, message };
