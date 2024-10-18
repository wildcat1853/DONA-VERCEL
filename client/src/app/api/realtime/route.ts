// api/realtime/route.ts

import { NextResponse } from 'next/server';
import { WebSocket } from 'ws';
import { RoomServiceClient, DataPacket_Kind } from 'livekit-server-sdk';

export async function POST() {
  console.log('openai-realtime API route called');

  try {
    // Initialize LiveKit Room Service Client
    const liveKitHost = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL;
    const liveKitApiKey = process.env.LIVEKIT_API_KEY;
    const liveKitApiSecret = process.env.LIVEKIT_API_SECRET;
    const roomName = 'your-room'; // Replace with your actual room name

    // Check that all required environment variables are set
    if (!liveKitHost) {
      throw new Error('LIVEKIT_URL or NEXT_PUBLIC_LIVEKIT_URL environment variable is not set.');
    }
    if (!liveKitApiKey || !liveKitApiSecret) {
      throw new Error('LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables must be set.');
    }
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set.');
    }

    const roomService = new RoomServiceClient(liveKitHost, liveKitApiKey, liveKitApiSecret);

    // Establish WebSocket connection to OpenAI Realtime API
    const openAIWs = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      }
    );

    openAIWs.on('open', () => {
      console.log('Connected to OpenAI Realtime API');

      // Send initial configuration
      openAIWs.send(
        JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['audio', 'text'],
            voice: 'alloy',
          },
        })
      );
    });

    openAIWs.on('message', async (data) => {
      console.log('Raw message from OpenAI:', data);
      try {
        const parsedData = JSON.parse(data.toString());
        console.log('Parsed message from OpenAI:', parsedData);

        switch (parsedData.type) {
          case 'response.audio.delta':
            if (parsedData.delta) {
              const audioBase64 = parsedData.delta;

              // Send audio data to LiveKit room
              await roomService.sendData(
                roomName,
                Buffer.from(audioBase64, 'base64'),
                DataPacket_Kind.RELIABLE
              );
            }
            break;
          case 'response.text.delta':
            if (parsedData.delta) {
              console.log('Received text response:', parsedData.delta);
              // Send text response via LiveKit data channel
              await roomService.sendData(
                roomName,
                Buffer.from(
                  JSON.stringify({ type: 'response_text', text: parsedData.delta })
                ),
                DataPacket_Kind.RELIABLE
              );
            }
            break;
          default:
            console.log('Received other type of message:', parsedData);
        }
      } catch (error) {
        console.error('Error parsing message from OpenAI:', error);
      }
    });

    openAIWs.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    openAIWs.on('close', (code, reason) => {
      console.log(`WebSocket closed with code ${code}. Reason: ${reason}`);
    });

    // Handle incoming audio from the client (if needed)

    return NextResponse.json({ message: 'WebSocket connection established' });
  } catch (error) {
    console.error('Error in openai-realtime API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}