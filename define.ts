import { message, project, user } from "client/src/db/schemas";
import type { InferSelectModel } from "drizzle-orm";


export type User = InferSelectModel<typeof user>;

export type Project = InferSelectModel<typeof project>;

export type Message = InferSelectModel<typeof message>;

export type Task = {
  id: string;
  name: string;
  description: string | null;
  status: "done" | "in progress";
  deadline: Date | null;
  projectId: string;
  createdAt: Date;
};
export type TaskStatusType = Task["status"];

export type MyToolInvocationType = {
  args: {
    title: string;
    description: string;
    deadline: string;
  };
};
