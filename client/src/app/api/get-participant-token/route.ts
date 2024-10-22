import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room');
  const username = req.nextUrl.searchParams.get('username');
  if (!room) {
    return NextResponse.json({ error: 'Missing "room" query parameter' }, { status: 400 });
  } else if (!username) {
    return NextResponse.json({ error: 'Missing "username" query parameter' }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const at = new AccessToken(apiKey, apiSecret, { identity: username });

  at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });

  return NextResponse.json({ token: await at.toJwt() });
}



// import { NextRequest, NextResponse } from 'next/server';
// import { AccessToken } from 'livekit-server-sdk';

// export async function POST(req: NextRequest) {
//   try {
//     // Parse the incoming JSON payload
//     const body = await req.json();

//     const {
//       instructions,
//       openaiAPIKey,
//       sessionConfig: {
//         turnDetection,
//         modalities,
//         voice,
//         temperature,
//         maxOutputTokens,
//         vadThreshold,
//         vadSilenceDurationMs,
//         vadPrefixPaddingMs,
//       },
//       room, // Optional: specify if you have a predefined room
//       username, // Optional: specify participant identity
//     } = body;

//     // Validate required fields
//     if (!instructions || !openaiAPIKey ) {
//       return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
//     }

//     // Generate a unique room name if not provided
//     const roomName = room || Math.random().toString(36).substring(7);
//     const userIdentity = username || 'human'; // Default identity if not provided

//     const apiKey = process.env.LIVEKIT_API_KEY;
//     const apiSecret = process.env.LIVEKIT_API_SECRET;
//     const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

//     if (!apiKey || !apiSecret || !wsUrl) {
//       return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
//     }

//     // Construct metadata for the agent
//     const metadata = {
//       instructions,
//       openai_api_key: openaiAPIKey,
//       modalities,
//       voice,
//       temperature,
//       max_output_tokens: maxOutputTokens,
//       turn_detection: JSON.stringify({
//         type: turnDetection.type,
//         threshold: vadThreshold,
//         silence_duration_ms: vadSilenceDurationMs,
//         prefix_padding_ms: vadPrefixPaddingMs,
//       }),
//     };

//     // Create the Access Token with metadata
//     const at = new AccessToken(apiKey, apiSecret, { identity: userIdentity, metadata: JSON.stringify(metadata) });

//     // Add grants with necessary permissions
//     at.addGrant({
//       room: roomName,
//       roomJoin: true,
//       canPublish: true,
//       canPublishData: true,
//       canSubscribe: true,
//       canUpdateOwnMetadata: true,
//     });

//     // Return the token and LiveKit server URL
//     return NextResponse.json({
//       accessToken: await at.toJwt(),
//       url: wsUrl,
//       room: roomName, // Optionally return room name
//     });
//   } catch (error) {
//     console.error('Error generating LiveKit token:', error);
//     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
//   }
// }