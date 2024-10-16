import * as Ably from 'ably';

let ably: Ably.Realtime | null = null;
let channel: Ably.RealtimeChannel | null = null;

interface AudioChunkMessage {
  data: string;
  chunkIndex: number;
  totalChunks: number;
  isLast: boolean;
}

export function connectWebSocket(onAudioChunk: (message: AudioChunkMessage) => void) {
  ably = new Ably.Realtime({ key: process.env.NEXT_PUBLIC_ABLY_API_KEY });
  channel = ably.channels.get('audio-channel');

  channel.subscribe('audio_chunk', (message) => {
    onAudioChunk(message.data as AudioChunkMessage);
  });

  ably.connection.on('connected', () => {
    console.log('Connected to Ably');
  });

  ably.connection.on('failed', () => {
    console.error('Failed to connect to Ably');
  });
}

export function disconnectWebSocket() {
  if (ably && ably.connection.state !== 'closed') {
    try {
      ably.connection.close();
      console.log('Closed the connection to Ably.');
    } catch (error) {
      console.error('Error closing Ably connection:', error);
    }
  } else {
    console.log('Ably connection already closed or not initialized.');
  }
  
  if (channel) {
    channel.unsubscribe();
  }
  
  ably = null;
  channel = null;
}

export function sendMessage(message: string) {
  if (channel) {
    channel.publish('tts_request', { text: message });
  }
}
