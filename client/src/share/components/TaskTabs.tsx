"use client";
import { Task } from "@/../../../define";
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import TaskCard from "./TaskCard";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { useLocalParticipant } from '@livekit/components-react';

type Props = { tasks: Task[]; assistantData: any; projectId: string };

// Create a new component for LiveKit integration
const TaskUpdater = ({ tasks }: { tasks: Task[] }) => {
  const { localParticipant } = useLocalParticipant();

  // Update agent whenever tasks change
  useEffect(() => {
    if (localParticipant) {
      const currentAttributes = localParticipant.attributes || {};
      
      const attributes = {
        ...currentAttributes,
        taskUpdate: 'true',
        taskData: JSON.stringify(tasks),
        timestamp: Date.now().toString()
      };
      
      console.log('🔄 TaskUpdater: Sending task update:', {
        participantId: localParticipant.identity,
        currentAttributes,
        newAttributes: attributes,
        tasks: tasks,
        timestamp: new Date().toISOString()
      });

      localParticipant.setAttributes(attributes);
    }
  }, [tasks, localParticipant]);

  return null; // This component doesn't render anything
};

function TaskTabs({ tasks, assistantData, projectId }: Props) {
  const { status } = assistantData;
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  const addEmptyTask = () => {
    const newTask: Task = {
      id: uuidv4(),
      name: "",
      description: "",
      status: "in progress",
      createdAt: new Date(),
      deadline: null,
      projectId: projectId,
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
          <TabsTrigger className="cursor-pointer text-gray-400" value="done">
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
              onCheckBoxClick={() => {
                setLocalTasks(localTasks.map(t => 
                  t.id === el.id ? { ...t, status: "done" } : t
                ));
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

// Modify ClientAssistantProvider to include TaskUpdater
export function TaskTabsWithLiveKit(props: Props) {
  return (
    <>
      <TaskTabs {...props} />
      <TaskUpdater tasks={props.tasks} />
    </>
  );
}

export default TaskTabs;
