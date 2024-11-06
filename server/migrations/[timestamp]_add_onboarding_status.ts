import { sql } from "drizzle-orm";
import { pgTable, text } from "drizzle-orm/pg-core";

export async function up(db: any) {
  await db.execute(
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_onboarding text DEFAULT 'true' NOT NULL`
  );
}

export async function down(db: any) {
  await db.execute(
    sql`ALTER TABLE users DROP COLUMN IF EXISTS is_onboarding`
  );
}
