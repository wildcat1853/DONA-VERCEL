import { Task } from '@/define/define';

export async function scheduleTaskEmails(task: Task, userEmail: string, meetingLink: string) {
  if (!task.deadline) return;

  const deadlineDate = new Date(task.deadline);
  const formattedDeadline = deadlineDate.toLocaleString();

  try {
    // Send immediate creation email
    await sendEmail({
      userEmail,
      taskName: task.name,
      taskDescription: task.description || '',
      deadline: formattedDeadline,
      meetingLink,
      emailType: 'creation'
    });

    // Schedule deadline email if within 72 hours
    const now = new Date();
    const maxScheduleTime = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours from now

    if (deadlineDate <= maxScheduleTime) {
      await sendEmail({
        userEmail,
        taskName: task.name,
        taskDescription: task.description || '',
        deadline: formattedDeadline,
        meetingLink,
        emailType: 'deadline',
        scheduledAt: deadlineDate.toISOString()
      });
    }
  } catch (error) {
    console.error('Error scheduling emails:', error);
    throw error;
  }
}

async function sendEmail(params: {
  userEmail: string;
  taskName: string;
  taskDescription: string;
  deadline: string;
  meetingLink: string;
  emailType: 'creation' | 'deadline';
  scheduledAt?: string;
}) {
  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    throw new Error('Failed to send email');
  }
  
  return await response.json();
} 