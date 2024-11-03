"use client";
import { Task } from "@/../../../define";
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import TaskCard from "./TaskCard";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

type Props = { tasks: Task[]; assistantData: any };

function TaskTabs({ tasks, assistantData }: Props) {
  const { status, append } = assistantData;
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const addEmptyTask = () => {
    const newTask: Task = {
      id: uuidv4(),
      name: "",
      description: "",
      status: "in progress",
      createdAt: new Date(),
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
      projectId: "", // Changed from null to an empty string to match the expected type 'string'
    };
    setLocalTasks([newTask, ...localTasks]);
  };

  // Calculate number of done tasks
  const doneTasksCount = localTasks.filter(task => task.status === "done").length;

  return (
    <Tabs defaultValue="to do" className="w-full ">
      <div className="flex justify-between items-center">
        <TabsList className="grid  grid-cols-2 ">
          <TabsTrigger className="cursor-pointer" value="to do">
            To do
          </TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="done">
            Done ({doneTasksCount})
          </TabsTrigger>
        </TabsList>
        <Button
          variant="secondary"
          className="hover:bg-secondary"
          onClick={addEmptyTask}
        >
          Add task
          <Plus />
        </Button>
      </div>
      <TabsContent
        value="to do"
        className="text-white flex flex-col mt-6 gap-3 overflow-auto"
      >
        {localTasks
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
              projectId={el.projectId}
              createdAt={el.createdAt}
              status={el.status}
              assistantStatus={status}
              deadline={el.deadline}
              onCheckBoxCLick={async () => {
                setLocalTasks(localTasks.map(t => 
                  t.id === el.id ? { ...t, status: "done" } : t
                ));
                
                if (status == "awaiting_message") {
                  append({
                    role: "data",
                    content: `I just finished task: ${el.name}`,
                  });
                }
              }}
              onUpdate={(updatedTask) => {
                setLocalTasks(localTasks.map(t => 
                  t.id === updatedTask.id ? updatedTask : t
                ));
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
              projectId={el.projectId}
              createdAt={el.createdAt}
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
