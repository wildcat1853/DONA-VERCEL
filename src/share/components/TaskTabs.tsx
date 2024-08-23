"use client";
import { Task } from "@/lib/define";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import TaskCard from "./TaskCard";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";

type Props = { tasks: Task[] };

function TaskTabs({ tasks }: Props) {
  return (
    <Tabs defaultValue="to do" className="w-full  !overflow-auto">
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
        className="text-white flex flex-col mt-6 gap-3"
      >
        {/* {tasks */}
        {[
          {
            id: "1",
            status: "in progress",
            description: "description",
            name: "Task 1",
          },
        ]
          .filter((el) => el.status == "in progress")
          .map((el) => (
            <TaskCard
              description={el.description}
              name={el.name}
              id={el.id}
              key={el.id}
              status={el.status}
            />
          ))}
      </TabsContent>
      <TabsContent value="done">
        {tasks
          .filter((el) => el.status == "done")
          .map((el) => (
            <TaskCard
              description={el.description}
              name={el.name}
              id={el.id}
              key={el.id}
              status={el.status}
            />
          ))}
      </TabsContent>
    </Tabs>
  );
}

export default TaskTabs;
