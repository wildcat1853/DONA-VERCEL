// utils/ably.ts

import Ably from 'ably';

let ablyInstance: Ably.Realtime | null = null;

export function getAblyClient(isBackend: boolean = false): Ably.Realtime {
  if (!ablyInstance) {
    const apiKey = isBackend
      ? process.env.ABLY_API_KEY_BACKEND
      : process.env.NEXT_PUBLIC_ABLY_API_KEY;
    if (!apiKey) {
      throw new Error('Ably API key is not set');
    }
    ablyInstance = new Ably.Realtime({ key: apiKey });
  }
  return ablyInstance;
}

export function getAblyChannel(channelName: string, isBackend: boolean = false): Ably.RealtimeChannel {
  const client = getAblyClient(isBackend);
  return client.channels.get(channelName);
}

export function closeAblyConnection(): void {
  if (ablyInstance) {
    ablyInstance.close();
    ablyInstance = null;
  }
}