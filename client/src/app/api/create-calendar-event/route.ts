import { NextResponse } from "next/server";
import { google } from 'googleapis';
import { getServerSession } from "next-auth";
import { authConfig } from "../auth/[...nextauth]/authConfig";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.accessToken) {
      return NextResponse.json({ error: "No access token found" }, { status: 401 });
    }

    const { taskName, description, deadline } = await request.json();

    // Create end time (30 minutes after deadline instead of 15)
    const endTime = new Date(deadline);
    endTime.setMinutes(endTime.getMinutes() + 30);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_ID,
      process.env.GOOGLE_SECRET,
      process.env.NEXTAUTH_URL
    );

    console.log('OAuth2 client created with credentials:', {
      hasClientId: !!process.env.GOOGLE_ID,
      hasClientSecret: !!process.env.GOOGLE_SECRET,
      nextAuthUrl: process.env.NEXTAUTH_URL
    });

    oauth2Client.setCredentials({
      access_token: session.accessToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const appUrl = process.env.NODE_ENV === 'production' 
      ? 'https://app.aidona.co'
      : 'http://localhost:3000';

    const event = {
      summary: "Review progress with Dona",
      description: "Follow the link in google calendar to review your progress with Dona",
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
        responseStatus: 'needsAction'
      }],
      location: appUrl,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 }
        ]
      },
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: true,
      visibility: 'private'
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all',
    });

    return NextResponse.json({ eventId: response.data.id });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { error: "Failed to create calendar event" },
      { status: 500 }
    );
  }
}
