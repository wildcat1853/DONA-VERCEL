import { InferSelectModel } from "drizzle-orm";
import { project, task } from "./schemas";

export type Project = InferSelectModel<typeof project>;

export type Task = InferSelectModel<typeof task>;
export type TaskStatusType = Task["status"];

export type MyToolInvocationType = {
  args: {
    title: string;
    description: string;
    deadline: string;
  };
};
