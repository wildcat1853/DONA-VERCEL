"use client";
import { getProject, setProjectThreadId } from "@/app/actions/project";
import useAssistant from "@/hooks/useAssistant";
import Image from "next/image";
import React, { useEffect } from "react";
import { Separator } from "../ui/separator";
import TaskTabs from "./TaskTabs";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Chat from "./Chat";
import { Task } from "@/lib/define";
import start from "@/../public/stars.svg";
import { useRouter } from "next/navigation";

type Props = {
  projectId: string;
  projectThreadId: string | undefined;
  serverMessages: any[];
  tasks: Task[];
};

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
    append({
      role: "data",
      content:
        "Today is " +
        new Date().toLocaleString() +
        ", but forget about it. Just say hi to me!",
    });
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
        <div className="absolute left-1/2 transform -translate-x-1/2 top-6 ">
          <Avatar className="rounded-full size-32 flex justify-center items-center">
            <AvatarImage src="https://s3-alpha-sig.figma.com/img/f519/87bd/f29e3840b6571edddafad02003369c3c?Expires=1725840000&Key-Pair-Id=APKAQ4GOSFWCVNEHN3O4&Signature=KfLOvejhugXgfsU-FtAkQcI8KkXzq7l82C9SwzMaRA7cSY2V2mkg1-aSIxP1D0O9xPE0Aw7ijiWldqJiptST-KY6nICLFKZHWkdh0ovm0yXqPwBB1bApulhyarFDnYtN9Jkbq9pMNF562~6krVryvjIifWEbneCfMkaMM14hCuBYwljOrwkRW8qYH957ASOnr3DAGIxJnuagXVQnnlAyYJO5WglFchZYLNTRl9nTJxf6hjWDG9j4Ua8lO80N8YHqPAsVmz6pTJ4-TMgLUbqRFUGxhA8Bzt0v2uB6axFBUZooTzNoXjP40YSVI53ssXwhZtXQQjRt~Da1xE9e-ChrRQ__" />
            <AvatarFallback className="text-black text-2xl">Dn</AvatarFallback>
          </Avatar>
        </div>
        <Chat assistantData={assistantData} />
      </div>
    </>
  );
}

export default ClientAssistantProvider;
