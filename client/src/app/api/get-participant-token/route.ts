// app/api/get-participant-token/route.ts

import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";
import { PlaygroundState } from "@/data/playground-state";

// Define the structure of the expected request body
interface TokenRequestBody {
  instructions: string;
  sessionConfig: {
    turnDetection: string;
    modalities: string;
    voice: string;
    temperature: number;
    maxOutputTokens: number | null;
    vadThreshold: number;
    vadSilenceDurationMs: number;
    vadPrefixPaddingMs: number;
  };
}

export async function POST(request: Request) {
  try {
    // Parse the JSON body
    const body: TokenRequestBody = await request.json();

    const {
      instructions,
      sessionConfig: {
        turnDetection,
        modalities,
        voice,
        temperature,
        maxOutputTokens,
        vadThreshold,
        vadSilenceDurationMs,
        vadPrefixPaddingMs,
      },
    } = body;

    // Generate a random room name or use a fixed one
    const roomName = "Dona-Room"; // Change to random if needed: Math.random().toString(36).substring(7);

    // Retrieve environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const openaiAPIKey = process.env.OPENAI_API_KEY;
    const livekitUrl = process.env.LIVEKIT_URL;

    // Validate environment variables
    if (!apiKey || !apiSecret || !openaiAPIKey || !livekitUrl) {
      console.error("Missing environment variables:", {
        apiKey: !!apiKey,
        apiSecret: !!apiSecret,
        openaiAPIKey: !!openaiAPIKey,
        livekitUrl: !!livekitUrl,
      });
      return NextResponse.json(
        { error: "Server misconfigured. Missing API keys." },
        { status: 500 }
      );
    }

    // Create an access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: "User", // Change as per your requirement
      metadata: JSON.stringify({
        instructions: instructions,
        modalities: modalities,
        voice: voice,
        temperature: temperature,
        max_output_tokens: maxOutputTokens,
        openai_api_key: openaiAPIKey, // Server-side OpenAI API key
        turn_detection: JSON.stringify({
          type: turnDetection,
          threshold: vadThreshold,
          silence_duration_ms: vadSilenceDurationMs,
          prefix_padding_ms: vadPrefixPaddingMs,
        }),
      }),
    });

    // Add grants to the token
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
      canUpdateOwnMetadata: true,
    });

    // Generate the JWT
    const jwt = await at.toJwt();

    // Return the token and LiveKit URL
    return NextResponse.json({
      accessToken: jwt,
      url: livekitUrl,
    });
  } catch (error) {
    console.error("Error generating token:", error);
    return NextResponse.json(
      { error: "Internal Server Error." },
      { status: 500 }
    );
  }
}



// .../ 

// import { NextRequest, NextResponse } from 'next/server';
// import { AccessToken } from 'livekit-server-sdk';

// export async function GET(req: NextRequest) {
//   const room = req.nextUrl.searchParams.get('room');
//   const username = req.nextUrl.searchParams.get('username');
//   if (!room) {
//     return NextResponse.json({ error: 'Missing "room" query parameter' }, { status: 400 });
//   } else if (!username) {
//     return NextResponse.json({ error: 'Missing "username" query parameter' }, { status: 400 });
//   }

//   const apiKey = process.env.LIVEKIT_API_KEY;
//   const apiSecret = process.env.LIVEKIT_API_SECRET;
//   const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

//   if (!apiKey || !apiSecret || !wsUrl) {
//     return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
//   }

//   const at = new AccessToken(apiKey, apiSecret, { identity: username });

//   at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });

//   return NextResponse.json({ token: await at.toJwt() });
// }
// ....verion


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