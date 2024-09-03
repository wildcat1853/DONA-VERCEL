"use client";
import { Task } from "@/lib/define";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import TaskCard from "./TaskCard";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";

type Props = { tasks: Task[] };

function TaskTabs({ tasks }: Props) {
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
        <Button variant={"secondary"}>
          Add task
          <Plus />
        </Button>
      </div>
      <TabsContent
        value="to do"
        className="text-white flex flex-col mt-6 gap-3 overflow-auto"
      >
        {tasks
          .filter((el) => el.status == "in progress")
          .map((el) => (
            <TaskCard
              description={el.description}
              name={el.name}
              id={el.id}
              key={el.id}
              status={el.status}
              deadline={el.deadline}
            />
          ))}
      </TabsContent>
      <TabsContent
        value="done"
        className="text-white flex flex-col mt-6 gap-3 overflow-auto"
      >
        {tasks
          .filter((el) => el.status == "done")
          .map((el) => (
            <TaskCard
              description={el.description}
              name={el.name}
              id={el.id}
              key={el.id}
              status={el.status}
              deadline={el.deadline}
            />
          ))}
      </TabsContent>
    </Tabs>
  );
}

export default TaskTabs;
