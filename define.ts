import { InferSelectModel } from "drizzle-orm";
import { message, project, task, user } from "./schemas.js";

export type User = InferSelectModel<typeof user>;

export type Project = InferSelectModel<typeof project>;

export type Message = InferSelectModel<typeof message>;

export type Task = InferSelectModel<typeof task>;
export type TaskStatusType = Task["status"];

export type MyToolInvocationType = {
  args: {
    title: string;
    description: string;
    deadline: string;
  };
};
