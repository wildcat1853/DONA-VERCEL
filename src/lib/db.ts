// lib/db.ts

import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { project, task, message } from './schemas';
import { ENV } from './env';

const DATABASE_URL = ENV.DATABASE_URL;

const client = new Client({
  connectionString: DATABASE_URL,
});

client.connect();

export const db = drizzle(client);
export { project, task, message };
