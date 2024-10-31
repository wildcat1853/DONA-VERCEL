// app/api/get-participant-token/route.ts

import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";

// Define the structure of the expected request body
interface TokenRequestBody {
  instructions?: string; // Make it optional
  room: string; // Add room to the interface
  sessionConfig: {
    model: string;
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
      room, // Extract room name
      sessionConfig: {
        model,
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

    // Use the provided room name
    const roomName = room;

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
        roomName: roomName, // Include the room name
        model: "gpt-4", // Changed to GPT-4
        instructions: instructions || "",
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
