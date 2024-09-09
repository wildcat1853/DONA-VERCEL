"use client";
import { Task } from "@/../../../define";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import TaskCard from "./TaskCard";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";

type Props = { tasks: Task[]; assistantData: any };

function TaskTabs({ tasks, assistantData }: Props) {
  const { status, append } = assistantData;
  return (
    <Tabs defaultValue="to do" className="w-full ">
      <div className="flex justify-between items-center">
        <TabsList className="grid  grid-cols-2 ">
          <TabsTrigger className="cursor-pointer" value="to do">
            To do
          </TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="done">
            Done
          </TabsTrigger>
        </TabsList>
        <Button
          variant={"secondary"}
          disabled={status != "awaiting_message"}
          onClick={() => {
            if (status == "awaiting_message")
              append({
                role: "user",
                content: "please help me create a task",
              });
          }}
        >
          Add task
          <Plus />
        </Button>
      </div>
      <TabsContent
        value="to do"
        className="text-white flex flex-col mt-6 gap-3 overflow-auto"
      >
        {tasks
          .filter(
            (el): el is Task & { status: "in progress" } =>
              el.status == "in progress"
          )
          .map((el) => (
            <TaskCard
              description={el.description}
              name={el.name}
              id={el.id}
              key={el.id}
              status={el.status}
              assistantStatus={status}
              deadline={el.deadline}
              onCheckBoxCLick={() => {
                if (status == "awaiting_message") {
                  append({
                    role: "data",
                    content: `I just finished task: ${el.name}`,
                  });
                }
              }}
            />
          ))}
      </TabsContent>
      <TabsContent
        value="done"
        className="text-white flex flex-col mt-6 gap-3 overflow-auto"
      >
        {tasks
          .filter((el): el is Task & { status: "done" } => el.status == "done")
          .map((el) => (
            <TaskCard
              description={el.description}
              name={el.name}
              id={el.id}
              key={el.id}
              status={el.status}
              assistantStatus={status}
              deadline={el.deadline}
            />
          ))}
      </TabsContent>
    </Tabs>
  );
}

export default TaskTabs;
