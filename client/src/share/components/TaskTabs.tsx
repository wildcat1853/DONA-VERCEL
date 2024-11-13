"use client";
import { Task } from "@/../../../define";
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import TaskCard from "./TaskCard";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { RoomEvent, DataPacket_Kind } from 'livekit-client';

type Props = { tasks: Task[]; assistantData: any; projectId: string };

// Create a new component for LiveKit data messaging
const TaskUpdater = ({ tasks }: { tasks: Task[] }) => {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  // Update agent whenever tasks change
  useEffect(() => {
    if (localParticipant && room) {
      const taskUpdate = {
        type: 'taskUpdate',
        tasks: tasks,
        timestamp: Date.now()
      };

      // Convert to Uint8Array
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(taskUpdate));

      // Publish data reliably to the room
      localParticipant.publishData(data, {
        reliable: true,
      });

      console.log('📤 TaskUpdater: Sent task update');
    }
  }, [tasks, localParticipant, room]);

  return null;
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
    <Tabs defaultValue="todo" className="w-full">
      <div className="flex justify-between items-start h-[80px]">
        <TabsList className="flex space-x-2 bg-gray-200 rounded-full p-1 w-[200px] h-[45px]">
          <TabsTrigger
            value="todo"
            className="flex-1 px-4 py-2 rounded-full text-sm font-medium text-gray-700
              hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition
              data-[state=active]:bg-white data-[state=active]:shadow-md"
          >
            To do
          </TabsTrigger>
          <TabsTrigger
            value="done"
            className="flex-1 px-4 py-2 rounded-full text-sm font-medium text-gray-700
              hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition
              data-[state=active]:bg-white data-[state=active]:shadow-md"
          >
            Done ({doneTasksCount})
          </TabsTrigger>
        </TabsList>
        <Button
          onClick={addEmptyTask}
          className="w-[120px] flex items-center justify-center gap-2 py-6 text-blue-500 hover:text-blue-600 hover:bg-blue-50 border border-solid border-blue-200"
        >
          <Plus className="h-4 w-4" />
          Add task
        </Button>
      </div>

      <TabsContent value="todo" className="mt-6 mb-2 space-y-4">
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
      
      <TabsContent value="done" className="mt-6 mb-2 space-y-4">
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
