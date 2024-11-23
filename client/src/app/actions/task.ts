'use server'

import { db, task } from "@/../../../db"
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Task } from "../../../../define";

interface TaskDataWithEmail extends Partial<Task> {
    id: string;
    userEmail?: string;
}

export async function toggleTaskStatus(taskId: string) {
    let taskData = await db.query.task.findFirst({
        where: (task, { eq }) => eq(task.id, taskId)
    });
    
    if (!taskData) {
        console.log(`Task ${taskId} not found - it may have been removed`);
        return;
    }

    await db.update(task).set({
        status: taskData.status == 'in progress' ? "done" : 'in progress'
    }).where(eq(task.id, taskId));

    revalidatePath('/chat/' + taskData.projectId)
}

export async function saveTask(taskData: Partial<Task> & { id: string }) {
    // Ensure deadline is never null when saving
    const dataToSave = {
        ...taskData,
        deadline: taskData.deadline || new Date(), // Use current date if no deadline
    };

    await db.update(task)
        .set(dataToSave)
        .where(eq(task.id, taskData.id));
    
    revalidatePath('/chat/' + taskData.projectId);
}

export async function createOrUpdateTask(taskData: TaskDataWithEmail) {
    console.log('Received taskData:', taskData);

    if (!taskData.name?.trim()) {
        return;
    }

    if (!taskData.projectId) {
        console.log('Missing projectId in taskData:', taskData);
        throw new Error("Project ID is required");
    }

    const existingTask = await db.query.task.findFirst({
        where: (task, { eq }) => eq(task.id, taskData.id)
    });

    const currentDate = new Date();
    const deadline = taskData.deadline || currentDate;

    if (existingTask) {
        await db.update(task)
            .set({
                ...taskData,
                status: taskData.status || 'in progress',
                deadline,
            })
            .where(eq(task.id, taskData.id));
    } else {
        await db.insert(task).values({
            id: taskData.id,
            name: taskData.name,
            projectId: taskData.projectId,
            status: taskData.status || 'in progress',
            description: taskData.description || null,
            deadline,
            createdAt: currentDate
        });
    }
    
    revalidatePath('/chat/' + taskData.projectId);
}

