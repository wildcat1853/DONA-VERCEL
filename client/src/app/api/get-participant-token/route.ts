// app/api/get-participant-token/route.ts

import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";

// Define the structure of the expected request body
interface TokenRequestBody {
  room: string; // Add room to the interface
  sessionConfig: {
    model: string;
    turnDetection: string;
    modalities: string;
    voice: string;
    instructions: string;
    isOnboarding: boolean;
    temperature?: number;
    maxOutputTokens?: number | null;
    vadThreshold: number;
    vadSilenceDurationMs: number;
    vadPrefixPaddingMs: number;
    metadata: {
      userId: string;
      isOnboarding: boolean;
      tasks?: any[];
    }
  };
}

export async function POST(request: Request) {
  try {
    // Parse the JSON body
    const body: TokenRequestBody = await request.json();

    const { room, sessionConfig } = body;

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
      identity: "User",
      metadata: JSON.stringify({
        roomName: room,
        model: "gpt-4o-realtime-preview-2024-10-01",
        modalities: sessionConfig.modalities,
        voice: sessionConfig.voice,
        openai_api_key: openaiAPIKey,
        instructions: sessionConfig.instructions,
        isOnboarding: sessionConfig.isOnboarding,
        tasks: sessionConfig.metadata.tasks,
        turn_detection: JSON.stringify({
          type: sessionConfig.turnDetection,
          threshold: sessionConfig.vadThreshold,
          silence_duration_ms: sessionConfig.vadSilenceDurationMs,
          prefix_padding_ms: sessionConfig.vadPrefixPaddingMs,
        }),
      }),
    });

    // Add grants to the token
    at.addGrant({
      room: room,
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
