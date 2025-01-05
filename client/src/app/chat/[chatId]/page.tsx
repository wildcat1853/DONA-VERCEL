import { db, message } from "@/db/db";
import React, { Suspense } from "react";
import AccountButton from "@/share/components/AccountButton";
import getServerUser from "@/hooks/getServerUser";
import { redirect } from "next/navigation";
import ClientAssistantProvider from "@/share/components/ClientAssistantProvider";

type Props = {
  params: { chatId: string };
  searchParams: {};
};

async function getData(chatId: string, userId: string) {
  const projectData = await db.query.project.findFirst({
    where: (project, { eq, and }) =>
      and(eq(project.id, chatId), eq(project.userId, userId)),
  });

  const tasksPromise = db.query.task.findMany({
    where: (tasks, { eq }) => eq(tasks.projectId, projectData?.id || ''),
    columns: {
      id: true,
      name: true,
      description: true,
      status: true,
      deadline: true,
      projectId: true,
      createdAt: true
    }
  });

  const serverMessagesPromise = db.query.message.findMany({
    where: (messages, { eq }) => eq(messages.projectId, chatId),
    orderBy: message.createdAt,
    columns: {
      id: true,
      content: true,
      role: true,
      createdAt: true,
      projectId: true
    }
  });

  return Promise.all([projectData, tasksPromise, serverMessagesPromise]);
}

export default async function ChatPage({ params }: Props) {
  const userData = await getServerUser();
  
  if (!userData) {
    redirect("/auth");
  }

  // Get params asynchronously according to Next.js 15 spec
  const { chatId } = await params;

  const [projectData, tasks, serverMessages] = await getData(chatId, userData.id);

  if (!projectData) {
    redirect("/auth");
  }

  return (
    <div className="relative flex max-h-screen">
      <AccountButton user={userData} />
      <Suspense fallback={<div>Loading...</div>}>
        <ClientAssistantProvider
          projectId={chatId}
          projectThreadId={projectData.threadId ?? undefined}
          serverMessages={serverMessages}
          tasks={tasks}
          userId={userData.id}
        />
      </Suspense>
    </div>
  );
}
