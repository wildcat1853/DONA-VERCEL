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
const OPENAI_ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID; // Add this line

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
import { RoomEvent } from "@livekit/rtc-node";
import * as openai from "@livekit/agents-plugin-openai";
import type {
  Participant,
} from "@livekit/rtc-node";

function safeLogConfig(config: SessionConfig): string {
  const safeConfig = { ...config, openaiApiKey: "[REDACTED]", model: "[REDACTED]" };
  return JSON.stringify(safeConfig);
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    console.log('Agent is starting and attempting to connect to LiveKit server.');

    await ctx.connect();

    console.log('Agent connected to LiveKit server.');

    console.log('Waiting for a participant to join the room...');

    const participant = await ctx.waitForParticipant();

    console.log(`Participant connected: ${participant.identity}`);

    await runMultimodalAgent(ctx, participant);
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
  model: string;
  voice: string;
  temperature: number;
  maxOutputTokens?: number;
  modalities: ["text", "audio"] | ["text"];
  turnDetection?: TurnDetectionType;
}


function parseSessionConfig(data: any): SessionConfig {
  return {
    openaiApiKey: process.env.OPENAI_API_KEY || "",
    model: data.model || process.env.OPENAI_ASSISTANT_ID || "",
    voice: data.voice || "",
    temperature: parseFloat(data.temperature || "0.8"),
    maxOutputTokens:
      data.max_output_tokens === "inf"
        ? Infinity
        : parseInt(data.max_output_tokens) || undefined,
    modalities: modalitiesFromString(data.modalities || "text_and_audio"),
    turnDetection: data.turn_detection ? JSON.parse(data.turn_detection) : undefined,
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

async function runMultimodalAgent(ctx: JobContext, participant: Participant) {
  try {
    const metadata = JSON.parse(participant.metadata || '{}');
    const config = parseSessionConfig(metadata);
    console.log(`Starting multimodal agent with config: ${safeLogConfig(config)}`);

    const model = new openai.realtime.RealtimeModel({
      apiKey: config.openaiApiKey,
      model: config.model,
      voice: config.voice,
      temperature: config.temperature,
      maxResponseOutputTokens: config.maxOutputTokens,
      modalities: config.modalities,
      turnDetection: config.turnDetection,
    });

    const agent = new multimodal.MultimodalAgent({ model });
    let session = (await agent.start(ctx.room)) as openai.realtime.RealtimeSession;

    // Handle participant disconnection
    ctx.room.on(RoomEvent.ParticipantDisconnected, (disconnectedParticipant: Participant) => {
      if (disconnectedParticipant.identity === participant.identity) {
        console.log(`Participant ${participant.identity} disconnected.`);
        // Close the session and clean up
        session.close();
        // Optionally exit or wait for reconnection
      }
    });

    // Handle participant attribute changes
    ctx.room.on(
      "participantAttributesChanged",
      (
        changedAttributes: Record<string, string>,
        changedParticipant: Participant,
      ) => {
        if (changedParticipant.identity !== participant.identity) {
          return;
        }

        // Parse the metadata into an object
        const participantMetadata = JSON.parse(changedParticipant.metadata || '{}');

        const newConfig = parseSessionConfig({
          ...participantMetadata,
          ...changedAttributes,
        });

        session.sessionUpdate({
          temperature: newConfig.temperature,
          maxResponseOutputTokens: newConfig.maxOutputTokens,
          modalities: newConfig.modalities,
          turnDetection: newConfig.turnDetection,
        });
      },
    );

    // Handle session close events
    session.on('close', async (code: number, reason: string) => {
      console.error(`OpenAI Realtime connection closed: [${code}] ${reason}`);
      // Decide whether to restart the session or perform cleanup
      // For now, we'll exit the agent
      process.exit(0);
    });

    // Handle session errors
    session.on('error', async (error: any) => {
      console.error('Session error:', error);
      // Handle errors, possibly restart the session
    });

    // Since you're using a predefined assistant, you might not need to send an initial message

  } catch (error) {
    console.error("Error in runMultimodalAgent:", error);
  }
}

cli.runApp(new WorkerOptions({
  agent: fileURLToPath(import.meta.url)
}));