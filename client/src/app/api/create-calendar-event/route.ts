import { NextResponse } from "next/server";
import { google } from 'googleapis';
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/api/auth/[...nextauth]/authConfig";
import { OAuth2Client } from 'google-auth-library';

async function getValidAccessToken(oauth2Client: OAuth2Client, session: any) {
    try {
        // Verify the token
        const tokenInfo = await oauth2Client.getTokenInfo(session.accessToken);
        console.log('🔍 Token info:', tokenInfo);
        
        return session.accessToken;
    } catch (error) {
        console.log('⚠️ Token validation failed, attempting refresh...');
        
        if (!session.refreshToken) {
            throw new Error('No refresh token available');
        }

        // Set the credentials with the refresh token
        oauth2Client.setCredentials({
            refresh_token: session.refreshToken
        });

        // Get a new access token
        const { credentials } = await oauth2Client.refreshAccessToken();
        console.log('🔄 New token obtained');
        
        return credentials.access_token;
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authConfig);
        console.log('🔑 Session check:', {
            hasSession: !!session,
            hasEmail: !!session?.user?.email,
            hasAccessToken: !!session?.accessToken,
            hasRefreshToken: !!session?.refreshToken
        });
        
        if (!session?.user?.email || !session?.accessToken) {
            return NextResponse.json({ 
                error: "No user email or access token found" 
            }, { status: 401 });
        }

        const { taskName, description, deadline } = await request.json();

        // Create end time (30 minutes after deadline)
        const endTime = new Date(new Date(deadline).getTime() + 30 * 60000);

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
        );

        // Get a valid access token
        const validAccessToken = await getValidAccessToken(oauth2Client, session);
        
        // Set the credentials with the valid token
        oauth2Client.setCredentials({
            access_token: validAccessToken
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // Create calendar event
        const event = {
            summary: `Task Deadline: ${taskName}`,
            description: description || 'No description provided',
            start: {
                dateTime: new Date(deadline).toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            attendees: [{
                email: session.user.email
            }],
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', minutes: 10 }
                ]
            }
        };

        console.log('📅 Creating calendar event:', event);

        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
            sendUpdates: 'all'
        });

        console.log('✅ Calendar event created:', {
            id: response.data.id,
            link: response.data.htmlLink
        });

        return NextResponse.json({
            eventId: response.data.id,
            htmlLink: response.data.htmlLink
        });

    } catch (error: any) {
        console.error('🚨 General Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
