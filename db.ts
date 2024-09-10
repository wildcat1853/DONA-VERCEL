// lib/db.ts

import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { project, task, message } from "./schemas";
import * as schema from "./schemas";
import { config } from "dotenv";
import path from 'path'
config({ path: path.resolve(process.cwd(), '../.env') })

const DATABASE_URL = process.env.DATABASE_URL;

const client = new Client({
  connectionString: DATABASE_URL,
});

client.connect();

export const db = drizzle(client, { schema: schema });
export { project, task, message };
