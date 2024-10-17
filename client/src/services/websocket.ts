// services/websocket.ts

import * as Ably from 'ably';
import { getAblyClient, getAblyChannel } from '../utils/ably';

let channel: Ably.RealtimeChannel | null = null;

interface AudioChunkMessage {
  data: string;
  chunkIndex: number;
  totalChunks: number;
  isLast: boolean;
  type?: string;
}

export function connectWebSocket(
  onAudioMessage: (message: AudioChunkMessage) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ably = getAblyClient();

    if (ably.connection.state === 'connected') {
      setupChannel(ably, onAudioMessage);
      console.log('Ably already connected and channel set up.');
      resolve();
      return;
    }

    ably.connection.once('connected', () => {
      console.log('Connected to Ably');
      setupChannel(ably, onAudioMessage);
      resolve();
    });

    ably.connection.on('failed', (err) => {
      console.error('Failed to connect to Ably:', err);
      reject(err);
    });

    ably.connection.on('disconnected', () => {
      console.log('Disconnected from Ably');
    });
  });
}

function setupChannel(
  ably: Ably.Realtime,
  onAudioMessage: (message: AudioChunkMessage) => void
) {
  channel = getAblyChannel('audio-channel');
  channel.subscribe((message) => {
    if (message.data.type === 'audio_chunk') {
      onAudioMessage(message.data as AudioChunkMessage);
    } else if (message.data.type === 'response_text') {
      // Handle text response
      console.log('Received text response:', message.data.text);
    } else {
      console.warn('Unknown message type:', message.data.type);
    }
  });
  console.log('Ably channel "audio-channel" initialized and subscribed.');
}

export function disconnectWebSocket() {
  if (channel) {
    channel.unsubscribe();
    channel = null;
  }
}

export function sendAudioChunk(audioChunk: AudioChunkMessage) {
  if (channel) {
    console.log(
      `Sending audio chunk: ${audioChunk.chunkIndex + 1}/${audioChunk.totalChunks}`
    );
    channel.publish('input_audio_buffer.append', audioChunk);
  } else {
    console.warn('Channel not initialized. Audio chunk not sent.');
  }
}

export function commitAudioBuffer() {
  if (channel) {
    console.log('Committing audio buffer');
    channel.publish('input_audio_buffer.commit', {});
  } else {
    console.warn('Channel not initialized. Audio buffer not committed.');
  }
}

export function createResponse() {
  if (channel) {
    console.log('Requesting response from Realtime API');
    channel.publish('response.create', {});
  } else {
    console.warn('Channel not initialized. Response not requested.');
  }
}
