import { getServerSession } from "next-auth";
import React from "react";
import { authConfig } from "../api/auth/[...nextauth]/authConfig";
import getServerUser from "@/hooks/getServerUser";
import { db } from "@/db/db";
import { project } from "@/db/schemas";
import AuthWrapper from "./AuthWrapper";

export const dynamic = 'force-dynamic';

export default async function AuthPage() {
  const session = await getServerSession(authConfig);
  console.log('Auth Page - Session:', session?.user?.email);
  
  if (session?.user) {
    try {
      const userData = await getServerUser();
      console.log('Auth Page - User Data:', userData?.email);
      
      if (!userData) {
        console.error('No user data found');
        return <AuthWrapper session={session} user={session?.user} />;
      }

      // Find or create project
      let projectData = await db.query.project.findFirst({
        where: (project, { eq }) => eq(project.userId, userData.id),
      });
      console.log('Auth Page - Project Data:', projectData?.id);

      if (!projectData) {
        console.log('Auth Page - Creating new project');
        projectData = (
          await db
            .insert(project)
            .values({
              name: "My Project",
              userId: userData.id,
            })
            .returning()
        )[0];
        console.log('Auth Page - New Project Created:', projectData.id);
      }

      return <AuthWrapper 
        session={session} 
        user={session?.user} 
        redirectTo={`/chat/${projectData.id}`} 
      />;
    } catch (error) {
      console.error('Error in auth flow:', error);
      return <AuthWrapper session={session} user={session?.user} />;
    }
  }

  console.log('Auth Page - No session, showing auth wrapper');
  return <AuthWrapper session={session} user={session?.user} />;
}
