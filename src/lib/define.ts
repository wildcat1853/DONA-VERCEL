import { InferSelectModel } from "drizzle-orm";
import { message, project, task } from "./schemas";

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
