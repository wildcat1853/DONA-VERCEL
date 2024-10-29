// SPDX-License-Identifier: Apache-2.0







// Load environment variables from .env.local
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Determine the directory of agent.ts
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local in the root directory
dotenv.config({ path: join(__dirname, "../.env.local") });

// Destructure environment variables
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Log environment file path
console.log('Environment file path:', process.env.NODE_ENV ? `${process.env.PWD}/.env.${process.env.NODE_ENV}` : `${process.env.PWD}/.env`);
console.log('Current working directory:', process.cwd());

// Debug environment variables
console.log('Environment Variables:');
console.log('- LIVEKIT_URL:', LIVEKIT_URL || 'not set');
console.log('- LIVEKIT_API_KEY:', LIVEKIT_API_KEY ? '[REDACTED]' : 'not set');
console.log('- LIVEKIT_API_SECRET:', LIVEKIT_API_SECRET ? '[REDACTED]' : 'not set');
console.log('- OPENAI_API_KEY:', OPENAI_API_KEY ? '[REDACTED]' : 'not set');

// Validate required LiveKit environment variables
if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.error("Error: Missing required LiveKit environment variables:");
  if (!LIVEKIT_URL) console.error("- LIVEKIT_URL is missing");
  if (!LIVEKIT_API_KEY) console.error("- LIVEKIT_API_KEY is missing");
  if (!LIVEKIT_API_SECRET) console.error("- LIVEKIT_API_SECRET is missing");
  process.exit(1);
}



// Import necessary modules after loading env variables
import { WorkerOptions, cli, defineAgent, multimodal, JobContext } from "@livekit/agents";
import * as openai from "@livekit/agents-plugin-openai";
import type {
  LocalParticipant,
  Participant,
  TrackPublication,
} from "@livekit/rtc-node";
import { RemoteParticipant, TrackSource } from "@livekit/rtc-node";

import { v4 as uuidv4 } from "uuid";

function safeLogConfig(config: SessionConfig): string {
  const safeConfig = { ...config, openaiApiKey: "[REDACTED]" };
  return JSON.stringify(safeConfig);
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    await runMultimodalAgent(ctx);
  },
});

type TurnDetectionType = {
  type: "server_vad";
  threshold?: number;
  prefix_padding_ms?: number;
  silence_duration_ms?: number;
};

interface SessionConfig {
  openaiApiKey: string;
  instructions: string;
  voice: string;
  temperature: number;
  maxOutputTokens?: number;
  modalities: string[];
  turnDetection: TurnDetectionType | null;
}

function parseSessionConfig(data: any): SessionConfig {
  return {
    openaiApiKey: process.env.OPENAI_API_KEY || "",
    instructions: data.instructions || "",
    voice: data.voice || "",
    temperature: parseFloat(data.temperature || "0.8"),
    maxOutputTokens:
      data.max_output_tokens === "inf"
        ? Infinity
        : parseInt(data.max_output_tokens) || undefined,
    modalities: modalitiesFromString(data.modalities || "text_and_audio"),
    turnDetection: data.turn_detection ? JSON.parse(data.turn_detection) : null,
  };
}

function modalitiesFromString(
  modalities: string,
): ["text", "audio"] | ["text"] {
  const modalitiesMap: { [key: string]: ["text", "audio"] | ["text"] } = {
    text_and_audio: ["text", "audio"],
    text_only: ["text"],
  };
  return modalitiesMap[modalities] || ["text", "audio"];
}

function getMicrophoneTrackSid(participant: Participant): string | undefined {
  return Array.from(participant.trackPublications.values()).find(
    (track: TrackPublication) => track.source === TrackSource.SOURCE_MICROPHONE,
  )?.sid;
}

async function runMultimodalAgent(ctx: JobContext) {
  try {
    const config = {
      instructions: "Your knowledge cutoff is 2023-10. You are a helpful, witty, and friendly AI. Act like a human, but remember that you aren't a human and that you can't do human things in the real world. Your voice and personality should be warm and engaging, with a lively and playful tone.",
      voice: "alloy",
      temperature: 0.8,
      maxOutputTokens: Infinity,
      modalities: ["text", "audio"] as ["text", "audio"],
      turnDetection: {
        type: "server_vad" as const,
        threshold: 0.5,
        silence_duration_ms: 200,
        prefix_padding_ms: 300
      }
    };

    let session: openai.realtime.RealtimeSession;
    let isReconnecting = false;

    const initSession = async () => {
      const model = new openai.realtime.RealtimeModel({
        apiKey: process.env.OPENAI_API_KEY!,
        ...config
      });

      const agent = new multimodal.MultimodalAgent({ model });
      return (await agent.start(ctx.room)) as openai.realtime.RealtimeSession;
    };

    const restartSession = async () => {
      if (isReconnecting) return; // Prevent multiple simultaneous reconnection attempts
      
      isReconnecting = true;
      console.log('Restarting OpenAI Realtime session');
      
      try {
        await session?.close().catch(e => console.log('Error closing session:', e));
        session = await initSession();
        
        // Reinitialize the conversation
        session.conversation.item.create({
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Session restarted. Please continue our conversation.",
            },
          ],
        });
        session.response.create();
        
        console.log('Session restarted successfully');
      } catch (error) {
        console.error('Error restarting session:', error);
      } finally {
        isReconnecting = false;
      }
    };

    session = await initSession();

    // Handle session close events
    session.on('close', async (code: number, reason: string) => {
      console.error(`OpenAI Realtime connection closed: [${code}] ${reason}`);
      await restartSession();
    });

    // Handle session errors
    session.on('error', async (error: any) => {
      console.error('Session error:', error);
      if (error.code === 'session_expired' || 
          (error.type === 'invalid_request_error' && error.code === 'session_expired')) {
        await restartSession();
      }
    });

    // Initial conversation start
    session.conversation.item.create({
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text: "Please begin the interaction with the user in a manner consistent with your instructions.",
        },
      ],
    });
    session.response.create();

  } catch (error) {
    console.error("Error in runMultimodalAgent:", error);
  }
}

cli.runApp(new WorkerOptions({ 
  agent: fileURLToPath(import.meta.url)// Add this line
}));





