import { NextResponse } from "next/server";
import { google } from 'googleapis';
import { getServerSession } from "next-auth";
import { authConfig } from "../auth/[...nextauth]/authConfig";
import { Resend } from 'resend';
import { EmailTemplate } from '@/components/EmailTemplate';

async function sendConfirmationAndScheduleReminder(
  userEmail: string, 
  scheduledDate: string, 
  calendarLink: string,
  deadline: Date,
  projectId: string
) {
  try {
    const resend = new Resend(process.env.RESEND_KEY);
    console.log('Sending confirmation and scheduling reminder for:', userEmail);

    // Send immediate confirmation email
    const { data: confirmationData, error: confirmationError } = await resend.emails.send({
      from: 'Dona AI <dona@resend.dev>',
      to: userEmail,
      subject: 'Your Session with Dona is Scheduled',
      react: EmailTemplate({
        userEmail,
        scheduledDate,
        meetingLink: calendarLink
      })
    });

    if (confirmationError) {
      console.error('Error sending confirmation email:', confirmationError);
      return { success: false, error: confirmationError };
    }

    console.log('Confirmation email sent successfully:', {
      emailId: confirmationData?.id,
      to: userEmail,
      scheduledFor: scheduledDate
    });

    // Schedule reminder email for 10 minutes before
    const reminderTime = new Date(deadline.getTime() - 10 * 60000);
    console.log('Scheduling reminder email for:', {
      to: userEmail,
      scheduledFor: reminderTime.toISOString(),
      meetingLink: `${process.env.NEXTAUTH_URL}/chat/${projectId}`
    });

    const { data: reminderData, error: reminderError } = await resend.emails.send({
      from: 'Dona AI <dona@resend.dev>',
      to: userEmail,
      subject: 'Upcoming Session with Dona',
      react: EmailTemplate({
        userEmail,
        scheduledDate,
        meetingLink: `${process.env.NEXTAUTH_URL}/chat/${projectId}`,
        isReminder: true
      }),
      scheduledAt: reminderTime.toISOString()
    });

    if (reminderError) {
      console.error('Error scheduling reminder email:', reminderError);
      return { 
        success: true, 
        confirmationEmailId: confirmationData?.id,
        reminderError 
      };
    }

    console.log('Reminder email scheduled successfully:', {
      emailId: reminderData?.id,
      to: userEmail,
      scheduledFor: reminderTime.toISOString(),
      projectId
    });

    console.log('All emails processed successfully:', {
      confirmationEmailId: confirmationData?.id,
      reminderEmailId: reminderData?.id,
      userEmail,
      scheduledFor: scheduledDate,
      reminderAt: reminderTime.toISOString()
    });

    return { 
      success: true, 
      confirmationEmailId: confirmationData?.id,
      reminderEmailId: reminderData?.id 
    };
  } catch (error) {
    console.error('Failed to process emails:', error);
    return { success: false, error };
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.email || !session.accessToken) {
      return NextResponse.json({ 
        error: "No user email or access token found" 
      }, { status: 401 });
    }

    const { taskName, description, deadline, projectId } = await request.json();

    const endTime = new Date(deadline);
    endTime.setMinutes(endTime.getMinutes() + 30);

    // Use OAuth2 with user's access token
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_ID,
      process.env.GOOGLE_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    );

    oauth2Client.setCredentials({
      access_token: session.accessToken
    });

    const calendar = google.calendar({
      version: 'v3',
      auth: oauth2Client
    });

    const event = {
      summary: "Sync with Dona",
      description: `Please give update on your task at ${process.env.NEXTAUTH_URL}`,
      start: {
        dateTime: new Date(deadline).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      attendees: [{
        email: session.user.email,
        responseStatus: 'needsAction',
        optional: false
      }],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 5 },
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 }
        ]
      },
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: false,
      sendUpdates: 'all',
      status: 'confirmed'
    };

    try {
      console.log('Attempting to create calendar event:', {
        userEmail: session.user.email,
        hasAccessToken: !!session.accessToken
      });

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all',
        conferenceDataVersion: 0
      });

      console.log('Calendar event created successfully:', {
        eventId: response.data.id,
        status: response.status,
        organizer: response.data.organizer,
        attendees: response.data.attendees
      });

      const formattedDate = new Date(deadline).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });

      // Send confirmation and schedule reminder in one go
      const emailResult = await sendConfirmationAndScheduleReminder(
        session.user.email,
        formattedDate,
        response.data.htmlLink || '',
        new Date(deadline),
        projectId
      );

      return NextResponse.json({ 
        eventId: response.data.id,
        htmlLink: response.data.htmlLink,
        emailSent: emailResult.success,
        confirmationEmailId: emailResult.confirmationEmailId,
        reminderEmailId: emailResult.reminderEmailId,
        reminderError: emailResult.reminderError
      });

    } catch (calendarError: any) {
      console.error('Calendar API Error:', {
        status: calendarError.response?.status,
        message: calendarError.message,
        errors: calendarError.response?.data?.error
      });
      
      return NextResponse.json({
        error: "Calendar API Error",
        details: calendarError.message
      }, { status: calendarError.response?.status || 500 });
    }
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
