import { Task } from "@/app/api/tasks/route";
import { db } from "@/lib/db";
import Chat from "@/share/components/Chat";
import TaskTabs from "@/share/components/TaskTabs";
import { Avatar, AvatarImage } from "@/share/ui/avatar";
import { Separator } from "@/share/ui/separator";
import { AvatarFallback } from "@radix-ui/react-avatar";
import React from "react";

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
      <div className="w-1/3 bg-zinc-800 relative  flex flex-col items-center max-h-[100vh]">
        <div className="w-full h-1/5 bg-zinc-600 absolute top-0 " />
        <div>
          <Avatar className="rounded-full size-48 mt-10">
            <AvatarImage src="https://s3-alpha-sig.figma.com/img/4fe0/1d8f/13661e3a07d998d6cb8a763a2fb3cf06?Expires=1723420800&Key-Pair-Id=APKAQ4GOSFWCVNEHN3O4&Signature=RhgxBVgDu-N7jhubUBA9gQDpCc8Lj-N1fRLwOKKBF9DBHlDGk-YoadhrSe64VVrJ4IQwdm0oYcD2W~0WtRocuyuQI8JTvrZyeyvTdt9T~wlSJjJ73RAenkCNw0wqIPpyBhUJitLDd9RnFeZuIB4Daa7ubEj8ExCGZvBSxskHgvkgCskbXHcCLNTI57kzu5xRbPwxPinDWFFftXdSJ1F~sCSQVIYUxliOjl8gwg4snVg8lRKTlRlz-C2ZMvIi2cGYTNiHGgRcDATN24NMMH0JKLQ-UBMy7c3W71yqRvPe3LxBSmIZ8U7klrjqEU6xyr~Qhne6BQE2kfEqql2UrRwm5A__" />
            <AvatarFallback>Dn</AvatarFallback>
          </Avatar>
        </div>
        <p className="!text-white mt-7 font-semibold text-3xl">Dona</p>
        <Separator className="mt-10 bg-gray-600" />
        <TaskTabs tasks={tasks} />
      </div>
      <div className="flex flex-col w-screen h-screen max-h-screen">
        <Chat projectId={params.chatId} serverMessages={serverMessages} />
      </div>
    </div>
  );
}

export default page;
