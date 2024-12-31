// SPDX-License-Identifier: Apache-2.0
import {
  type JobContext,
  WorkerOptions,
  cli,
  defineAgent,
  llm,
  multimodal,
} from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

console.log('🔧 Starting server setup...');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env.local');
dotenv.config({ path: envPath });

console.log('⚙️ Environment loaded');
console.log('📡 LiveKit URL:', process.env.LIVEKIT_URL);
console.log('🔑 API Key:', process.env.LIVEKIT_API_KEY ? '✓ Set' : '✗ Missing');
console.log('🔒 API Secret:', process.env.LIVEKIT_API_SECRET ? '✓ Set' : '✗ Missing');

const worker = defineAgent({
  entry: async (ctx: JobContext) => {
    console.log('🔌 Connecting to LiveKit...');
    
    // Add event listeners before connecting
    ctx.room.on('participantConnected', () => {
      console.log('👤 Participant connected to room');
    });

    ctx.room.on('participantDisconnected', () => {
      console.log('👋 Participant disconnected from room');
    });

    await ctx.connect();
    console.log('✅ Connected to LiveKit');
    
    console.log('⏳ Waiting for participant...');
    const participant = await ctx.waitForParticipant();
    console.log(`✅ Starting agent for ${participant.identity}`);

    const metadata = JSON.parse(participant.metadata || '{}');
    console.log('📋 Participant metadata:', metadata);

    const model = new openai.realtime.RealtimeModel({
      apiKey: process.env.OPENAI_API_KEY,
      instructions: metadata.instructions || 'You are a helpful assistant.',
      model: metadata.model || "gpt-4",
      voice: metadata.voice || "",
      temperature: parseFloat(metadata.temperature || "0.8"),
    });
    console.log('✅ Model created');

    const agent = new multimodal.MultimodalAgent({ model });
    console.log('🤖 Agent created, starting session...');
    
    const session = await agent
      .start(ctx.room, participant)
      .then((session) => session as openai.realtime.RealtimeSession);
    console.log('✅ Session started');

    console.log('💬 Creating initial message...');
    session.conversation.item.create(llm.ChatMessage.create({
      role: llm.ChatRole.ASSISTANT,
      text: 'How can I help you today?',
    }));

    session.response.create();

    // Keep the session alive
    await new Promise(() => {});
  },
});

console.log('📡 Starting server...');

const workerOptions = new WorkerOptions({ 
  agent: fileURLToPath(import.meta.url),
  port: parseInt(process.env.PORT || '8081', 10),
  host: '0.0.0.0',
  wsURL: process.env.LIVEKIT_URL,
  apiKey: process.env.LIVEKIT_API_KEY,
  apiSecret: process.env.LIVEKIT_API_SECRET
});

console.log('🔧 Worker options:', workerOptions);
cli.runApp(workerOptions);

export default worker;