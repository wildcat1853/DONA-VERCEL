
import { nanoid } from "nanoid";
import {
  text,
  timestamp,
  pgTable,
  pgEnum,
  json,
} from "drizzle-orm/pg-core";
import { MyToolInvocationType, Task } from "./define";


export type User = typeof user.$inferSelect;
export const user = pgTable("users", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(8)),
  name: text("name").notNull(),
  email: text("email").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$default(() => new Date())
    .notNull(),
});

export const project = pgTable("projects", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(8)),
  name: text("name"),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  threadId: text('threadId'),
  createdAt: timestamp("created_at")
    .$default(() => new Date())
    .notNull(),
});

export const statusEnum = pgEnum("status", ["done", "in progress"]);

export const task = pgTable("tasks", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(8)),
  name: text("name").notNull(),
  description: text("description"),
  status: statusEnum("status").$type<"done" | "in progress">(),
  deadline: timestamp("deadline"),
  projectId: text("projectId")
    .notNull()
    .references(() => project.id),
});

export const roleEnum = pgEnum("role", ["user", "assistant", 'data']);
export const message = pgTable("messages", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(8)),
  content: text("content").notNull(),
  role: roleEnum("role").notNull(),
  createdAt: timestamp("created_at")
    .$default(() => new Date())
    .notNull(),
  projectId: text("projectId")
    .notNull()
    .references(() => project.id),
  toolInvocations: json("toolInvocations").$type<Task[]>(),
});
