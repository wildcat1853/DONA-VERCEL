import { useChannel, useConnectionStateListener } from 'ably/react';
import { useState, useCallback } from 'react';

export function useAblyChannel(channelName: string) {
  const [messages, setMessages] = useState<any[]>([]);

  useConnectionStateListener('connected', () => {
    console.log('Connected to Ably!');
  });

  const { channel } = useChannel(channelName, 'message', (message) => {
    setMessages(prevMessages => [...prevMessages, message]);
  });

  const publishMessage = useCallback((data: any) => {
    channel.publish('message', data);
  }, [channel]);

  return { messages, publishMessage };
}