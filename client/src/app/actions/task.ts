'use server'

import { db, task } from "@/db/db"
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Task } from "@/define/define";

interface TaskDataWithEmail extends Partial<Task> {
    id: string;
    userEmail?: string;
    toolInvocations?: any;
}

export async function toggleTaskStatus(taskId: string) {
    let taskData = await db.query.task.findFirst({
        columns: {
            id: true,
            status: true,
            projectId: true
        },
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
    console.log('📥 Task creation/update - received data:', {
        taskId: taskData.id,
        name: taskData.name,
        deadline: taskData.deadline,
        rawDeadline: taskData.deadline ? new Date(taskData.deadline) : 'no deadline'
    });

    if (!taskData.name?.trim()) {
        return;
    }

    if (!taskData.projectId) {
        console.log('Missing projectId in taskData:', taskData);
        throw new Error("Project ID is required");
    }

    const existingTask = await db.query.task.findFirst({
        columns: {
            id: true,
            name: true,
            description: true,
            status: true,
            deadline: true,
            projectId: true,
            createdAt: true
        },
        where: (task, { eq }) => eq(task.id, taskData.id)
    });

    const deadline = taskData.deadline || null;

    if (existingTask) {
        console.log('🔄 Updating existing task:', {
            id: existingTask.id,
            oldDeadline: existingTask.deadline,
            newDeadline: deadline
        });
        
        await db.update(task)
            .set({
                name: taskData.name,
                description: taskData.description,
                status: taskData.status || 'in progress',
                deadline,
                projectId: taskData.projectId
            })
            .where(eq(task.id, taskData.id));
    } else {
        console.log('➕ Creating new task with deadline:', deadline);
        
        await db.insert(task).values({
            id: taskData.id,
            name: taskData.name,
            projectId: taskData.projectId,
            status: taskData.status || 'in progress',
            description: taskData.description || null,
            deadline,
            createdAt: new Date()
        });
    }

    // If there's a deadline, create a calendar event
    if (deadline && taskData.userEmail) {
        try {
            console.log('🗓️ Attempting to create calendar event:', {
                deadline,
                userEmail: taskData.userEmail,
                taskName: taskData.name
            });

            const response = await fetch('/api/create-calendar-event', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    taskName: taskData.name,
                    description: taskData.description,
                    deadline: deadline,
                    projectId: taskData.projectId
                }),
            });

            const result = await response.json();
            console.log('📬 Calendar event creation response:', result);

            if (!response.ok) {
                console.error('Failed to create calendar event:', result);
            }
        } catch (error) {
            console.error('🚨 Error creating calendar event:', error);
        }
    } else {
        console.log('⏭️ Skipping calendar event creation:', {
            hasDeadline: !!deadline,
            hasUserEmail: !!taskData.userEmail
        });
    }
    
    const savedTask = await db.query.task.findFirst({
        columns: {
            id: true,
            name: true,
            deadline: true
        },
        where: (task, { eq }) => eq(task.id, taskData.id)
    });
    
    console.log('💾 Saved task verification:', savedTask);
    
    revalidatePath('/chat/' + taskData.projectId);
}

