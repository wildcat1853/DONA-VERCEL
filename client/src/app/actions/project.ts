'use server'

import { db, project } from "@/../../../db"
import { eq } from "drizzle-orm";

export async function getProject(projectId: string) {
    const project = await db.query.project.findFirst({
        where: (project, { eq }) => eq(project.id, projectId)
    });
    return project;
}
export async function setProjectThreadId(projectId: string, threadId: string) {
    await db.update(project).set({ threadId }).where(eq(project.id, projectId));
}