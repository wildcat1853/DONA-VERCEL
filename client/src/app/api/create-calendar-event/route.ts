import { NextResponse } from "next/server";
import { google } from 'googleapis';
import { getServerSession } from "next-auth";
import { authConfig } from "../auth/[...nextauth]/authConfig";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authConfig);
    console.log('Session received:', {
      hasSession: !!session,
      hasAccessToken: !!session?.accessToken,
      userEmail: session?.user?.email
    });

    if (!session?.accessToken) {
      console.log('No access token in session');
      return NextResponse.json({ error: "No access token found" }, { status: 401 });
    }

    const { taskName, description, deadline } = await request.json();
    console.log('Task details:', { taskName, description, deadline });

    // Create end time (15 minutes after deadline)
    const endTime = new Date(deadline);
    endTime.setMinutes(endTime.getMinutes() + 15);

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

    const event = {
      summary: `Dona Task Review: ${taskName}`,
      description: description || 'Task review with Dona',
      start: {
        dateTime: new Date(deadline).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: [{ email: session.user.email }],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
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
