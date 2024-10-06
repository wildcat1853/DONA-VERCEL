import WebSocket from 'ws';
import dotenv from 'dotenv';

dotenv.config();

let ws: WebSocket | null = null;

export function initializeRealtimeAPI() {
  const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
  ws = new WebSocket(url, {
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "OpenAI-Beta": "realtime=v1",
    },
  });

  ws.on('open', () => console.log('Connected to OpenAI Realtime API'));
  ws.on('message', handleRealtimeMessage);
  ws.on('error', (error) => console.error('WebSocket error:', error));
  ws.on('close', () => {
    console.log('Disconnected from OpenAI Realtime API');
    // Implement reconnection logic here if needed
  });
}

function handleRealtimeMessage(message: WebSocket.Data) {
  const event = JSON.parse(message.toString());
  if (event.type === 'response.audio.delta') {
    // Here you would typically send this audio chunk to the client
    // For now, we'll just log it
    console.log('Received audio chunk:', event.delta.audio.slice(0, 20) + '...');
    
    // TODO: Implement logic to send audio chunk to client
    // This might involve emitting an event to your existing socket connection with the client
    // Example: io.emit('audio_chunk', event.delta.audio);
  }
}

export async function sendToRealtimeAPI(text: string) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error('WebSocket is not connected');
  }

  const event = {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: text }]
    }
  };
  ws.send(JSON.stringify(event));
  ws.send(JSON.stringify({type: 'response.create', response: {modalities: ["audio"]}}));
}

// Optional: Add a function to check connection status
export function isRealtimeAPIConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}

// Optional: Add a function to close the connection
export function closeRealtimeAPI() {
  if (ws) {
    ws.close();
    ws = null;
  }
}
