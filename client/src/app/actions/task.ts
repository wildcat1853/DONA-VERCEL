'use server'

import { db, task } from "@/lib/db"
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function toggleTaskStatus(taskId: string) {
    let taskData = await db.query.task.findFirst({
        where: (task, { eq }) => eq(task.id, taskId)
    });
    if (!taskData) throw new Error("there is no such task");

    await db.update(task).set({
        status: taskData.status == 'in progress' ? "done" : 'in progress'
    }).where(eq(task.id, taskId));

    revalidatePath('/chat/' + taskData.projectId)
}

