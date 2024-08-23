import { Task } from "@/lib/define";
import { db } from "@/lib/db";
import Chat from "@/share/components/Chat";
import TaskTabs from "@/share/components/TaskTabs";
import { Avatar, AvatarImage } from "@/share/ui/avatar";
import { Separator } from "@/share/ui/separator";
import { AvatarFallback } from "@radix-ui/react-avatar";
import React from "react";
import Image from "next/image";
import start from "@/../public/stars.svg";

type Props = {
  params: { chatId: string };
  searchParams: {};
};

async function page({ params }: Props) {
  const tasks: Task[] = await db.query.task.findMany({
    where: (tasks, { eq }) => eq(tasks.projectId, params.chatId),
  });
  const serverMessages = await db.query.message.findMany({
    where: (messages, { eq }) => eq(messages.projectId, params.chatId),
  });
  return (
    <div className="flex">
      <div className="w-7/12 flex justify-center">
        <div className="relative w-2/3 flex flex-col  gap-9 max-h-[100vh] mt-40">
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
          <div>
            <TaskTabs tasks={tasks} />
          </div>
        </div>
      </div>
      <div className="w-5/12 relative ">
        <div className="absolute left-1/2 transform -translate-x-1/2 top-6 ">
          <Avatar className="rounded-full size-32 flex justify-center items-center ">
            <AvatarImage src="" />
            <AvatarFallback className="text-black text-2xl">Dn</AvatarFallback>
          </Avatar>
        </div>
        <Chat projectId={params.chatId} serverMessages={serverMessages} />
      </div>
    </div>
  );
}

export default page;
