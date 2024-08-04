"use client";
import { Task } from "@/app/api/tasks/route";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { CardDone, CardProgress } from "./Card";

type Props = { tasks: Task[] };

function TaskTabs({ tasks }: Props) {
  return (
    <Tabs defaultValue="pending" className="w-[400px] mx-4 mt-5 !overflow-auto">
      <TabsList className="grid w-full grid-cols-2 ">
        <TabsTrigger className="cursor-pointer" value="pending">
          Pending
        </TabsTrigger>
        <TabsTrigger className="cursor-pointer" value="done">
          Done
        </TabsTrigger>
      </TabsList>
      <TabsContent
        value="pending"
        className="text-white flex flex-col mt-5 gap-3"
      >
        {tasks
          .filter((el) => el.status == "in progress")
          .map((el) => (
            <CardProgress
              description={el.description}
              name={el.name}
              id={el.id}
              key={el.id}
            />
          ))}
      </TabsContent>
      <TabsContent value="done">
        {tasks
          .filter((el) => el.status == "done")
          .map((el) => (
            <CardDone
              description={el.description}
              name={el.name}
              id={el.id}
              key={el.id}
            />
          ))}
      </TabsContent>
    </Tabs>
  );
}

export default TaskTabs;
