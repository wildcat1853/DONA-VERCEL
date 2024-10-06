let socket: WebSocket | null = null;

export function connectWebSocket(onAudioChunk: (chunk: string) => void) {
  const WS_SERVER_URL = process.env.NEXT_PUBLIC_WS_SERVER_URL || 'ws://localhost:8080';
  
  socket = new WebSocket(WS_SERVER_URL);

  socket.onopen = () => {
    console.log('Connected to WebSocket server');
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'audio_chunk') {
      onAudioChunk(data.data);
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  socket.onclose = () => {
    console.log('Disconnected from WebSocket server');
  };
}

export function disconnectWebSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}
