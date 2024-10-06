"use client";
import { getProject, setProjectThreadId } from "@/app/actions/project";
import useAssistant from "@/hooks/useAssistant";
import Image from "next/image";
import React, { useEffect } from "react";
import { Separator } from "../ui/separator";
import TaskTabs from "./TaskTabs";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Chat from "./Chat";
import { Task } from "@/../.../../../../define";
import start from "@/../public/stars.svg";
import { useRouter } from "next/navigation";
import ReadyPlayerMeAvatar from "@/share/components/ReadyPlayerMeAvatar"; // Add this import at the top of the file

type Props = {
  projectId: string;
  projectThreadId: string | undefined;
  serverMessages: any[];
  tasks: Task[];
};

const avatarUrl = 'https://models.readyplayer.me/66fff8ab8fcc54d1d062d962.glb';

const usedDataId = new Set<string>();
function ClientAssistantProvider({
  projectId,
  projectThreadId,
  serverMessages,
  tasks,
}: Props) {
  const assistantData = useAssistant({ projectId, projectThreadId });
  const { status, messages, setMessages, append, threadId } = assistantData;
  const router = useRouter();

  useEffect(() => {
    if (!projectThreadId && threadId)
      (async () => {
        const project = await getProject(projectId);
        if (!project) throw new Error("no such project");
        if (project.threadId) return;
        await setProjectThreadId(projectId, threadId);
      })();
  }, [threadId]);

  useEffect(() => {
    setMessages(serverMessages);
    const todaysTasks = tasks.filter(
      (task) =>
        task.status == "in progress" &&
        new Date(task.deadline).toDateString() == new Date().toDateString()
    );
    const todaysMissedTasks = todaysTasks.filter(
      (task) => new Date(task.deadline) < new Date()
    );
    if (todaysMissedTasks.length) {
      append({
        role: "data",
        content: `Today is ${new Date().toLocaleString()}, but forget about it. My today's tasks are ${todaysMissedTasks
          .map((task) => ({ id: task.id, name: task.name }))
          .join(" , ")} ask me how is my progress`,
      });
    } else {
      append({
        role: "data",
        content: `Today is ${new Date().toLocaleString()}, but forget about it. Just say hi to me!`,
      });
    }
  }, []);
  useEffect(() => {
    const lastMsg = messages.at(-2);
    if (!lastMsg || lastMsg?.role != "data") return;
    if (usedDataId.has(lastMsg.id)) return;
    usedDataId.add(lastMsg.id);
    //@ts-ignore
    if (lastMsg?.data?.text) {
      router.refresh();
    }
  }, [messages]);

  return (
    <>
      <div className="w-7/12 flex justify-center max-h-screen overflow-auto">
        <div className="w-2/3 flex flex-col  gap-9 mt-40">
          <div>
            <div className="flex gap-4">
              <Image src={start} alt="stars" />
              <p className="font-semibold text-5xl tracking-tight">
                Project name
              </p>
            </div>
            <p className="text-base mt-5">Project description</p>
          </div>
          <Separator className="bg-gray-300" />
          <TaskTabs tasks={tasks} assistantData={assistantData} />
        </div>
      </div>
      <div className="w-5/12 relative">
        {/* Background div */}
        <div className="absolute top-0 right-0 w-full h-full bg-F1F2F4">
          {/* Gradient div as background for avatar */}
          <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-gray-200 via-gray-200 to-transparent">
            {/* Avatar container */}
            <div className="absolute left-1/2 transform -translate-x-1/2 top-6">
              <div className="w-64 h-64 rounded-full overflow-hidden bg-gray-100 shadow-glow">
                <div className="w-full h-full">
                  <ReadyPlayerMeAvatar 
                    avatarUrl={avatarUrl} 
                    width="100%" 
                    height="100%" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Chat component */}
        <Chat assistantData={assistantData} />
      </div>
    </>
  );
}

export default ClientAssistantProvider;
