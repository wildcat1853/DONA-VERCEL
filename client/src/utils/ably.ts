import Ably from 'ably';
export function getAblyClient() {
  return new Ably.Realtime({ key: process.env.NEXT_PUBLIC_ABLY_API_KEY });
}

export function getAblyChannel(client: Ably.Realtime, channelName: string) {
  return client.channels.get(channelName);
}
