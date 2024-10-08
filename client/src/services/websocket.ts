import * as Ably from 'ably';
let ably: Ably.Realtime | null = null;
let channel: Ably.RealtimeChannel | null = null;

export function connectWebSocket(onAudioChunk: (chunk: string) => void) {
  ably = new Ably.Realtime({ key: process.env.NEXT_PUBLIC_ABLY_API_KEY });
  channel = ably.channels.get('audio-channel');

  channel.subscribe('audio_chunk', (message) => {
    onAudioChunk(message.data);
  });

  ably.connection.on('connected', () => {
    console.log('Connected to Ably');
  });

  ably.connection.on('failed', () => {
    console.error('Failed to connect to Ably');
  });
}

export function disconnectWebSocket() {
  if (channel) {
    channel.unsubscribe();
  }
  if (ably) {
    ably.close();
  }
}

export function sendMessage(message: string) {
  if (channel) {
    channel.publish('tts_request', { text: message });
  }
}
