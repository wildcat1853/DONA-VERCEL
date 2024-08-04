// lib/db.ts

import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { project, task, message } from "./schemas";
import { ENV } from "./env";
import * as schema from "./schemas";

const DATABASE_URL = ENV.DATABASE_URL;

const client = new Client({
  connectionString: DATABASE_URL,
});

client.connect();

export const db = drizzle(client, { schema: schema });
export { project, task, message };
