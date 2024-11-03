'use server'

import { db, project } from "@/../../../db"
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getProject(projectId: string) {
    const project = await db.query.project.findFirst({
        where: (project, { eq }) => eq(project.id, projectId)
    });
    return project;
}
export async function setProjectThreadId(projectId: string, threadId: string) {
    await db.update(project).set({ threadId }).where(eq(project.id, projectId));
}

export async function saveProject({ id, name }: { id: string, name: string }) {
    await db.update(project)
        .set({ name })
        .where(eq(project.id, id));
    
    revalidatePath('/chat/' + id);
}