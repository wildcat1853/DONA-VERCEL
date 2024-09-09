import { db, message } from "@/../../../db";
import React from "react";
import AccountButton from "@/share/components/AccountButton";
import getServerUser from "@/hooks/getServerUser";
import { redirect } from "next/navigation";
import ClientAssistantProvider from "@/share/components/ClientAssistantProvider";

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
    orderBy: message.createdAt,
  });
  const [tasks, serverMessages] = await Promise.all([
    tasksPromise,
    serverMessagesPromise,
  ]);
  return (
    <div className="relative flex max-h-screen">
      <AccountButton user={userData} />
      <ClientAssistantProvider
        projectId={params.chatId}
        projectThreadId={
          projectData.threadId ? projectData.threadId : undefined
        }
        serverMessages={serverMessages}
        tasks={tasks}
      />
    </div>
  );
}

export default page;
