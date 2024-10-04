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
        <div className="">
        <div style={{ width: '100vw', height: '100vh' }}>
        <div style={{ width: '300px', height: '300px' }}>
         <ReadyPlayerMeAvatar />
       </div>
    </div>
        </div>
        <Chat assistantData={assistantData} />
      </div>
    </>
  );
}

export default ClientAssistantProvider;
