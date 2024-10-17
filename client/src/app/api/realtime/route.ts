// pages/api/conversation/openai-realtime.ts

import { NextResponse } from 'next/server';
import WebSocket from 'ws';
import { getAblyChannel } from '../../../utils/ably';

export async function POST() {
  console.log('openai-realtime API route called');

  try {
    // Ensure that the Ably channel is initialized with backend API key
    const channel = getAblyChannel('audio-channel', false);

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

    openAIWs.on('message', (data) => {
      console.log('Raw message from OpenAI:', data);
      try {
        const parsedData = JSON.parse(data.toString());
        console.log('Parsed message from OpenAI:', parsedData);
        
        switch (parsedData.type) {
          case 'response.audio.delta':
            if (parsedData.delta) {
              const audioBase64 = parsedData.delta;
              const chunkSize = 32000; // 32KB chunks
              const chunks = [];
              for (let i = 0; i < audioBase64.length; i += chunkSize) {
                chunks.push(audioBase64.slice(i, i + chunkSize));
              }

              chunks.forEach((chunk, index) => {
                channel.publish('audio_chunk', {
                  data: chunk,
                  chunkIndex: index,
                  totalChunks: chunks.length,
                  isLast: index === chunks.length - 1,
                  type: 'audio_chunk',
                });
              });
            }
            break;
          case 'response.text.delta':
            if (parsedData.delta) {
              console.log('Received text response:', parsedData.delta);
              channel.publish('response_text', { text: parsedData.delta, type: 'response_text' });
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

    // Handle incoming audio from the client
    channel.subscribe('input_audio_buffer.append', (message) => {
      console.log('Received audio chunk:', message.data);
      const audioChunk = message.data;
      openAIWs.send(
        JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: audioChunk.data,
        })
      );
    });

    channel.subscribe('input_audio_buffer.commit', () => {
      console.log('Committing audio buffer');
      openAIWs.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
    });

    channel.subscribe('response.create', () => {
      console.log('Requesting response from Realtime API');
      openAIWs.send(JSON.stringify({ type: 'response.create' }));
    });

    return NextResponse.json({ message: 'WebSocket connection established' });
  } catch (error) {
    console.error('Error in openai-realtime API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
