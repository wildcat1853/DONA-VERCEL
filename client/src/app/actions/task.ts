'use server'

import { db, task } from "@/../../../db"
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Task } from "../../../../define";

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

export async function saveTask(taskData: Partial<Task> & { id: string }) {
    await db.update(task)
        .set(taskData)
        .where(eq(task.id, taskData.id));
    
    revalidatePath('/chat/' + taskData.projectId);
}

