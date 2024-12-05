import { db, project } from "@/db/db";
import CreateProjectButton from "@/share/components/CreateProjectButton";
import { Card } from "@/share/ui/card";
import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import getServerUser from "@/hooks/getServerUser";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default async function DashboardPage() {
  try {
    const userData = await getServerUser();
    
    if (!userData) {
      console.log('No user data, redirecting to auth');
      redirect('/auth');
    }

    const projectData = await db.query.project.findFirst({
      where: (project, { eq }) => eq(project.userId, userData.id),
    });

    if (!projectData) {
      console.log('No project found, creating new one');
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

    const projects = await db.query.project.findMany({
      where: (project, { eq }) => eq(project.userId, userData.id),
    });

    return (
      <main className="max-w-[700px] mx-auto">
        <div className="flex items-end justify-between mt-24">
          <div className="flex flex-col gap-3">
            <p className="font-semibold text-2xl">Welcome to Dona AI</p>
          </div>
          <CreateProjectButton />
        </div>
        <p className="font-extrabold text-5xl mt-8">Your projects</p>
        <div className="grid grid-cols-2 gap-4 mt-10">
          {projects.map((el) => (
            <Link key={el.id} href={`/chat/${el.id}`}>
              <Card className="h-64 bg-gray-950 flex items-center justify-center cursor-pointer">
                <p className="font-semibold text-3xl text-white">{el.name}</p>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    );
  } catch (error) {
    console.error('Dashboard error:', error);
    redirect('/auth');
  }
}
