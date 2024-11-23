import { NextResponse } from "next/server";
import { google } from 'googleapis';
import { getServerSession } from "next-auth";
import { authConfig } from "../auth/[...nextauth]/authConfig";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authConfig);
    
    // Debug session state with token details
    console.log("Calendar Event Creation - Session:", {
      hasSession: !!session,
      hasAccessToken: !!session?.accessToken,
      email: session?.user?.email,
      tokenType: typeof session?.accessToken,
      tokenPrefix: session?.accessToken?.substring(0, 10) // Log first 10 chars of token
    });

    if (!session?.accessToken) {
      return NextResponse.json({ 
        error: "No access token found" 
      }, { status: 401 });
    }

    const { taskName, description, deadline } = await request.json();

    const endTime = new Date(deadline);
    endTime.setMinutes(endTime.getMinutes() + 30);

    // Create OAuth2 client with redirect URI
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_ID,
      process.env.GOOGLE_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`  // Add explicit redirect URI
    );

    // Set credentials with full token object
    oauth2Client.setCredentials({
      access_token: session.accessToken,
      token_type: 'Bearer'
    });

    const calendar = google.calendar({ 
      version: 'v3', 
      auth: oauth2Client 
    });

    const event = {
      summary: taskName || "Review progress with Dona",
      description: description || "Follow the link in google calendar to review your progress with Dona",
      start: {
        dateTime: new Date(deadline).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      attendees: [{
        email: session.user?.email,
        responseStatus: 'needsAction'
      }],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 0 },
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 }
        ]
      }
    };

    try {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all'
      });

      console.log('Calendar event created successfully:', {
        eventId: response.data.id,
        status: response.status,
        reminders: response.data.reminders
      });

      return NextResponse.json({ 
        eventId: response.data.id,
        htmlLink: response.data.htmlLink 
      });
    } catch (calendarError: any) {
      console.error('Calendar API Error:', {
        status: calendarError.response?.status,
        message: calendarError.message,
        errors: calendarError.response?.data?.error,
        token: session.accessToken?.substring(0, 10) // Log first 10 chars of token for debugging
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
