// lib/schemas.ts

import { nanoid }  from "nanoid";
import { serial, date, text, integer, timestamp, pgTable, pgEnum } from "drizzle-orm/pg-core";

export const project = pgTable("projects", {
    id: text("id").primaryKey().notNull().$defaultFn(() => nanoid(8)),
    name: text("name"),
    userId: text("userId").notNull(),
    createdAt: timestamp("created_at").$default(() => new Date()).notNull(),
});

export const statusEnum = pgEnum('status', ['done', 'in progress']);

export const task = pgTable("tasks", {
    id: text("id").primaryKey().notNull().$defaultFn(() => nanoid(8)),
    name: text("name").notNull(),
    description: text("description"),
    status: statusEnum("status").$type<'done' | 'in progress'>(),
    deadline: date("deadline"),
    projectId: text("projectId").notNull().references(() => project.id),
});

export const roleEnum = pgEnum('role', ['user', 'ai']);

export const message = pgTable("messages", {
    id: text("id").primaryKey().notNull().$defaultFn(() => nanoid(8)),
    content: text("content").notNull(),
    role: roleEnum("role").notNull(),
    createdAt: timestamp("created_at").$default(() => new Date()).notNull(),
    projectId: text("projectId").notNull().references(() => project.id),
});
