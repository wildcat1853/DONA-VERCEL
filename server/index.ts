import { Resend } from 'resend';
import Component from './unfinished-task-notification';
import { createClient } from '@supabase/supabase-js';
if (!process.env.RESEND_KEY) throw new Error("no resend key");
if (!process.env.SUPABASE_KEY) throw new Error("no supabase key");

const resend = new Resend(process.env.RESEND_KEY);

const supabaseUrl = 'https://rdlyjfadomyhfmgzsitn.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey);

setInterval(async () => {
    const { data: userData, error } = await supabase.from('users').select(`*,projects(userId,tasks(*))`);
    for (const user of userData || []) {
        for (const project of user.projects) {
            for (const task of project.tasks.filter(task => task.status == 'in progress' && new Date(task.deadline).toDateString() == new Date().toDateString())) {
                const { data, error } = await resend.emails.send({
                    from: 'Dona <dona@aidona.co>',
                    to: [user.email],
                    subject: 'Unfinished task',
                    react: Component({ userName: user.name, taskName: task.name, dueDate: new Date(task.deadline).toLocaleString(), taskUrl: 'https://www.google.com/' }),
                });

                if (error) {
                    return console.error({ error });
                }
                console.log({ data });
            }
        }
    }

}, 6 * 60 * 60 * 1000)
