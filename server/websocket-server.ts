import WebSocket, { WebSocketServer } from 'ws';
import { createServer } from 'http';

const server = createServer();
const wss = new WebSocketServer({ server });

let realtimeWs: WebSocket | null = null;

function initializeRealtimeAPI() {
  const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
  realtimeWs = new WebSocket(url, {
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "OpenAI-Beta": "realtime=v1",
    },
  });

  realtimeWs.on('open', () => console.log('Connected to OpenAI Realtime API'));
  realtimeWs.on('message', handleRealtimeMessage);
  realtimeWs.on('error', (error) => console.error('WebSocket error:', error));
  realtimeWs.on('close', () => {
    console.log('Disconnected from OpenAI Realtime API');
    realtimeWs = null;
  });
}

function handleRealtimeMessage(message: WebSocket.RawData) {
  const event = JSON.parse(message.toString());
  if (event.type === 'response.audio.delta') {
    // Broadcast audio chunk to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'audio_chunk', data: event.delta.audio }));
      }
    });
  }
}

async function sendToRealtimeAPI(text: string) {
  if (!realtimeWs || realtimeWs.readyState !== WebSocket.OPEN) {
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
  realtimeWs.send(JSON.stringify(event));
  realtimeWs.send(JSON.stringify({type: 'response.create', response: {modalities: ["audio"]}}));
}

wss.on('connection', (ws: WebSocket.WebSocket) => {
  console.log('Client connected');

  ws.on('message', (message: WebSocket.RawData) => {
    const data = JSON.parse(message.toString());
    if (data.type === 'tts_request') {
      sendToRealtimeAPI(data.text);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

initializeRealtimeAPI();

const PORT = process.env.WS_PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
});
