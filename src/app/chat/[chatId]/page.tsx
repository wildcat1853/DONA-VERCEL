import { Task } from "@/lib/define";
import { db, project } from "@/lib/db";
import Chat from "@/share/components/Chat";
import TaskTabs from "@/share/components/TaskTabs";
import { Avatar, AvatarImage } from "@/share/ui/avatar";
import { Separator } from "@/share/ui/separator";
import { AvatarFallback } from "@radix-ui/react-avatar";
import React from "react";
import Image from "next/image";
import start from "@/../public/stars.svg";
import AccountButton from "@/share/components/AccountButton";
import getServerUser from "@/hooks/getServerUser";
import { redirect } from "next/navigation";

type Props = {
  params: { chatId: string };
  searchParams: {};
};

async function page({ params }: Props) {
  const userData = await getServerUser();
  const projectData = await db.query.project.findFirst({
    where: (project, { eq, and }) =>
      and(eq(project.id, params.chatId), eq(project.userId, userData.id)),
  });

  if (!projectData) {
    redirect("/dashboard");
  }
  const tasksPromise = db.query.task.findMany({
    where: (tasks, { eq }) => eq(tasks.projectId, projectData.id),
  });
  const serverMessagesPromise = db.query.message.findMany({
    where: (messages, { eq }) => eq(messages.projectId, params.chatId),
  });
  const [tasks, serverMessages] = await Promise.all([
    tasksPromise,
    serverMessagesPromise,
  ]);
  return (
    <div className="relative flex max-h-screen">
      <AccountButton user={userData} />
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
          <TaskTabs tasks={tasks} />
        </div>
      </div>
      <div className="w-5/12 relative">
        <div className="absolute left-1/2 transform -translate-x-1/2 top-6 ">
          <Avatar className="rounded-full size-32 flex justify-center items-center">
            <AvatarImage src="https://s3-alpha-sig.figma.com/img/f519/87bd/f29e3840b6571edddafad02003369c3c?Expires=1725840000&Key-Pair-Id=APKAQ4GOSFWCVNEHN3O4&Signature=KfLOvejhugXgfsU-FtAkQcI8KkXzq7l82C9SwzMaRA7cSY2V2mkg1-aSIxP1D0O9xPE0Aw7ijiWldqJiptST-KY6nICLFKZHWkdh0ovm0yXqPwBB1bApulhyarFDnYtN9Jkbq9pMNF562~6krVryvjIifWEbneCfMkaMM14hCuBYwljOrwkRW8qYH957ASOnr3DAGIxJnuagXVQnnlAyYJO5WglFchZYLNTRl9nTJxf6hjWDG9j4Ua8lO80N8YHqPAsVmz6pTJ4-TMgLUbqRFUGxhA8Bzt0v2uB6axFBUZooTzNoXjP40YSVI53ssXwhZtXQQjRt~Da1xE9e-ChrRQ__" />
            <AvatarFallback className="text-black text-2xl">Dn</AvatarFallback>
          </Avatar>
        </div>
        <Chat projectId={params.chatId} serverMessages={serverMessages} />
      </div>
    </div>
  );
}

export default page;
