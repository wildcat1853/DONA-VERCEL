// pages/api/openai-realtime.ts
import { NextApiRequest, NextApiResponse } from 'next';
import * as Ably from 'ably';
import WebSocket from 'ws';

const ably = new Ably.Realtime({ key: process.env.ABLY_API_KEY! });
const channel = ably.channels.get('openai-realtime');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const openAIWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1',
    },
  });

  openAIWs.on('open', () => {
    console.log('Connected to OpenAI Realtime API');
  });

  openAIWs.on('message', (data) => {
    const parsedData = JSON.parse(data.toString());

    if (parsedData.type === 'response.audio.delta') {
      const audioBase64 = parsedData.audio;
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
          isLast: index === chunks.length - 1
        });
      });
    } else if (parsedData.type === 'response.text.done') {
      channel.publish('response_text', {
        text: parsedData.text,
      });
    } else {
      channel.publish('message', parsedData);
    }
  });

  channel.subscribe('message', (message) => {
    openAIWs.send(JSON.stringify(message.data));
  });

  openAIWs.on('error', (error) => {
    console.error('OpenAI WebSocket error:', error);
    channel.publish('message', { type: 'error', message: 'OpenAI WebSocket error' });
  });

  openAIWs.on('close', () => {
    console.log('OpenAI WebSocket closed');
    channel.publish('message', { type: 'error', message: 'OpenAI WebSocket closed' });
  });

  res.status(200).json({ message: 'OpenAI Realtime API connection established' });
}
