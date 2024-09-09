import { Resend } from 'resend';
import Component from './unfinished-task-notification';
import { eq } from 'drizzle-orm'
import { db, task } from '../db'
import { project, user } from '../schemas';
import { ENV } from '../env';
import { Project, Task, User } from '../define';

const resend = new Resend(ENV.RESEND_KEY);

setInterval(async () => {
    const userData = (await db.select().from(user)
        .leftJoin(project, eq(user.id, project.userId))
        .leftJoin(task, eq(project.id, task.projectId))
        .where(eq(task.status, 'in progress')))
        .filter((el): el is { users: User, tasks: Task, projects: Project | null } =>
            //@ts-ignore
            new Date(el.tasks?.deadline).toDateString()
            == new Date().toDateString());


    for (const { users, projects, tasks } of userData || []) {
        await new Promise(resolve => {
            setTimeout(
                //@ts-ignore
                () => resolve(), 600)
        })
        const { data, error } = await resend.emails.send({
            from: 'Dona <dona@aidona.co>',
            to: [users.email],
            subject: 'Unfinished task',
            react: Component({ userName: users.name, taskName: tasks.name, dueDate: new Date(tasks.deadline).toLocaleString(), taskUrl: 'https://www.google.com/' }),
        });

        if (error) {
            return console.error({ error });
        }
        console.log({ data });
    }

}, 6 * 60 * 60 * 1000)
