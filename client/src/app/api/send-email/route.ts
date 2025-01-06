import { EmailTemplate } from '@/components/EmailTemplate';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_KEY);

export async function POST(req: Request) {
  try {
    const { 
      userEmail, 
      taskName,
      taskDescription,
      deadline,
      meetingLink, 
      emailType,
      scheduledAt
    } = await req.json();

    console.log('📧 Attempting to send email with Resend:', {
      to: userEmail,
      type: emailType,
      key: process.env.RESEND_KEY ? 'present' : 'missing'
    });

    const emailData = {
      from: 'onboarding@resend.dev',
      to: [userEmail],
      subject: emailType === 'creation' ? 
        `Task Created: ${taskName}` : 
        `Task Deadline: Review progress with Dona - ${taskName}`,
      react: EmailTemplate({
        userEmail,
        taskName,
        taskDescription,
        deadline,
        meetingLink,
        emailType
      }) as React.ReactElement
    };

    if (scheduledAt) {
      Object.assign(emailData, { scheduledAt });
    }

    try {
      const { data, error } = await resend.emails.send(emailData);

      if (error) {
        console.error('❌ Resend API error:', error);
        throw error;
      }

      console.log('✅ Email sent successfully:', data);
      return NextResponse.json(data);
    } catch (sendError) {
      console.error('❌ Failed to send email:', sendError);
      throw sendError;
    }
  } catch (error) {
    console.error('❌ Email route error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
} 