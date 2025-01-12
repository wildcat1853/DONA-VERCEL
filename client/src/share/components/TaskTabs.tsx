"use client";
import { Task } from "@/define/define";
import React, { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import TaskCard from "./TaskCard";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { RoomEvent, DataPacket_Kind } from 'livekit-client';
import { track } from "@/share/utils/mixpanel";

type Props = { tasks: Task[]; assistantData: any; projectId: string };

// Create a new component for LiveKit data messaging
const TaskUpdater = ({ tasks }: { tasks: Task[] }) => {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!localParticipant || !room) return;

    const sendData = (type: 'initialTasks' | 'taskUpdate') => {
      try {
        const taskData = {
          type,
          tasks: tasks,
          timestamp: Date.now()
        };

        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(taskData));

        localParticipant.publishData(data, {
          reliable: true,
        });

        console.log(`📤 TaskUpdater: Sent ${type}`);
      } catch (error) {
        console.error('Failed to send task data:', error);
      }
    };

    // Send initial tasks only once
    if (!hasInitializedRef.current) {
      sendData('initialTasks');
      hasInitializedRef.current = true;
      return;
    }

    // Debounce regular updates
    const timeoutId = setTimeout(() => {
      sendData('taskUpdate');
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [tasks, localParticipant, room]);

  return null;
};

function TaskTabs({ tasks, assistantData, projectId }: Props) {
  const { status } = assistantData;
  const [localTasks, setLocalTasks] = useState<Task[]>(() => tasks);

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

    console.log("🎯 Tracking task creation:", {
      projectId,
      taskId: newTask.id,
      userId: assistantData?.userId,
      timestamp: new Date().toISOString()
    });

    track("Task Created", {
      projectId,
      taskId: newTask.id,
      userId: assistantData?.userId,
      timestamp: new Date().toISOString()
    });

    setLocalTasks([newTask, ...localTasks]);
  };

  // Calculate number of done tasks
  const doneTasksCount = localTasks.filter(task => task.status === "done").length;

  return (
    <Tabs defaultValue="todo" className="w-full">
      <div className="flex justify-between items-start h-[80px] flex-wrap gap-4">
        <TabsList className="flex space-x-2 bg-gray-200 rounded-full p-1 w-[200px] h-[45px] min-w-[200px]">
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
              el.status === "in progress"
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
                if (updatedTask.deadline && !el.deadline) {
                  track("Deadline Added", {
                    projectId,
                    taskId: updatedTask.id,
                    userId: assistantData?.userId,
                    deadline: updatedTask.deadline.toISOString(),
                    timestamp: new Date().toISOString()
                  });
                }
                
                setLocalTasks(localTasks.map(t => 
                  t.id === updatedTask.id ? updatedTask : t
                ));
              }}
            />
          ))}
      </TabsContent>
      
      <TabsContent value="done" className="mt-6 mb-2 space-y-4">
        {localTasks
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

// Modify TaskTabsWithLiveKit to include task review functionality
export function TaskTabsWithLiveKit(props: Props) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [isOnboarding] = useState(false);

  // Add task review effect
  useEffect(() => {
    if (!room || !localParticipant) {
      return; // Exit early if room context isn't ready
    }

    const sendTaskReviewData = async () => {
      try {
        if (room.state !== 'connected') {
          console.warn('❌ Room not connected');
          return;
        }

        const message = {
          type: 'taskReview',
          tasks: props.tasks,
          timestamp: Date.now(),
          userId: props.assistantData?.userId
        };

        console.log('📤 Sending task review data:', message);
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(message));
        localParticipant.publishData(data, {
          reliable: true,
        });

      } catch (error) {
        console.error('❌ Error sending task data:', error);
      }
    };

    // Only send if we have tasks
    if (props.tasks.length > 0) {
      sendTaskReviewData();
    }
  }, [props.tasks, localParticipant, room, props.assistantData?.userId]);

  return (
    <>
      <TaskTabs {...props} />
      <TaskUpdater tasks={props.tasks} />
    </>
  );
}

export default TaskTabs;
