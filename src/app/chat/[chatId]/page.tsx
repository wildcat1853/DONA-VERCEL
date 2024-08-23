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
          <Avatar className="rounded-full size-32 ">
            <AvatarImage src="https://s3-alpha-sig.figma.com/img/4fe0/1d8f/13661e3a07d998d6cb8a763a2fb3cf06?Expires=1723420800&Key-Pair-Id=APKAQ4GOSFWCVNEHN3O4&Signature=RhgxBVgDu-N7jhubUBA9gQDpCc8Lj-N1fRLwOKKBF9DBHlDGk-YoadhrSe64VVrJ4IQwdm0oYcD2W~0WtRocuyuQI8JTvrZyeyvTdt9T~wlSJjJ73RAenkCNw0wqIPpyBhUJitLDd9RnFeZuIB4Daa7ubEj8ExCGZvBSxskHgvkgCskbXHcCLNTI57kzu5xRbPwxPinDWFFftXdSJ1F~sCSQVIYUxliOjl8gwg4snVg8lRKTlRlz-C2ZMvIi2cGYTNiHGgRcDATN24NMMH0JKLQ-UBMy7c3W71yqRvPe3LxBSmIZ8U7klrjqEU6xyr~Qhne6BQE2kfEqql2UrRwm5A__" />
            <AvatarFallback>Dn</AvatarFallback>
          </Avatar>
        </div>
        <Chat projectId={params.chatId} serverMessages={serverMessages} />
      </div>
    </div>
  );
}

export default page;
