import { getServerSession } from "next-auth";
import React from "react";
import { authConfig } from "../api/auth/[...nextauth]/authConfig";
import ClientAuth from "./ClientAuth";
import { redirect } from "next/navigation";
import getServerUser from "@/hooks/getServerUser";
import { db } from "@/db/db";
import { project } from "@/db/schemas";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

type Props = {};

async function page({}: Props) {
  const session = await getServerSession(authConfig);
  if (session?.user) {
    const userData = await getServerUser();
    const projectData = await db.query.project.findFirst({
      where: (project, { eq }) => eq(project.userId, userData?.id),
    });
    if (!projectData) {
      const newProject = (
        await db
          .insert(project)
          .values({
            name: "My Project",
            userId: userData.id,
          })
          .returning()
      )[0];
      redirect("/chat/" + newProject.id);
    }
    redirect("/chat/" + projectData.id);
  }
  return (
    <div>
      You are being redirected to auth
      <ClientAuth user={session?.user} />
    </div>
  );
}

export default page;
