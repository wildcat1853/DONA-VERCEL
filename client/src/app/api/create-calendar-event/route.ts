import { NextResponse } from "next/server";
import { google } from 'googleapis';
import { getServerSession } from "next-auth";
import { authConfig } from "../auth/[...nextauth]/authConfig";
import { Resend } from 'resend';
import { EmailTemplate } from '@/components/EmailTemplate';

async function sendConfirmationEmail(userEmail: string, scheduledDate: string, calendarLink: string) {
  try {
    const resend = new Resend(process.env.RESEND_KEY);
    console.log('Attempting to send confirmation email to:', userEmail);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Dona AI <dona@resend.dev>',
      to: userEmail,
      subject: 'Your Session with Dona is Scheduled',
      react: EmailTemplate({
        userEmail,
        scheduledDate,
        meetingLink: calendarLink
      })
    });

    if (emailError) {
      console.error('Error sending confirmation email:', emailError);
      return { success: false, error: emailError };
    }
    if (emailData) {
      console.log('Confirmation email sent successfully:', {
        emailId: emailData.id,
        to: userEmail,
        scheduledFor: scheduledDate
      });
    }

    if (emailData) {
      return { success: true, emailId: emailData.id };
    } else {
      console.error('No email data received');
      return { success: false, error: 'No email data received' };
    }
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
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

    const { taskName, description, deadline } = await request.json();

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

      // After calendar event is created successfully, send confirmation email
      const formattedDate = new Date(deadline).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });

      const emailResult = await sendConfirmationEmail(
        session.user.email || '',
        formattedDate,
        response.data.htmlLink || ''
      );

      return NextResponse.json({ 
        eventId: response.data.id,
        htmlLink: response.data.htmlLink,
        emailSent: emailResult.success,
        emailId: emailResult.success ? emailResult.emailId : undefined
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
