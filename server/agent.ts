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

    const participant = await ctx.waitForParticipant();

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

async function runMultimodalAgent(
  ctx: JobContext,
  participant: RemoteParticipant,
) {
  try {
    const metadata = JSON.parse(participant.metadata);
    const config = parseSessionConfig(metadata);

    // Debugging: Log the parsed config without sensitive data
    console.log(
      `Starting multimodal agent with config: ${safeLogConfig(config)}`,
    );

    if (!config.openaiApiKey) {
      console.error("OpenAI API Key is missing in the session config.");
      return;
    }

    // Initialize the OpenAI Realtime Model
    const model = new openai.realtime.RealtimeModel({
      apiKey: process.env.OPENAI_API_KEY,
      instructions: config.instructions,
      voice: config.voice,
      temperature: config.temperature,
      maxResponseOutputTokens: config.maxOutputTokens,
      modalities: config.modalities as ["text", "audio"] | ["text"],
      turnDetection: config.turnDetection || undefined,
    });

    const agent = new multimodal.MultimodalAgent({ model });
    const session = (await agent.start(
      ctx.room,
    )) as openai.realtime.RealtimeSession;

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

    ctx.room.on(
      "participantAttributesChanged",
      (
        changedAttributes: Record<string, string>,
        changedParticipant: Participant,
      ) => {
        if (changedParticipant !== participant) {
          return;
        }
        const newConfig = parseSessionConfig({
          ...changedParticipant.attributes,
          ...changedAttributes,
        });

        session.sessionUpdate({
          instructions: newConfig.instructions,
          temperature: newConfig.temperature,
          maxResponseOutputTokens: newConfig.maxOutputTokens,
          modalities: newConfig.modalities as ["text", "audio"] | ["text"],
          turnDetection: newConfig.turnDetection,
        });
      },
    );

    async function sendTranscription(
      ctx: JobContext,
      participant: Participant,
      trackSid: string,
      segmentId: string,
      text: string,
      isFinal: boolean = true,
    ) {
      const transcription = {
        participantIdentity: participant.identity,
        trackSid: trackSid,
        segments: [
          {
            id: segmentId,
            text: text,
            startTime: BigInt(0),
            endTime: BigInt(0),
            language: "",
            final: isFinal,
          },
        ],
      };
      await (ctx.room.localParticipant as LocalParticipant).publishTranscription(
        transcription,
      );
    }

    session.on("response_done", (response: openai.realtime.RealtimeResponse) => {
      let message: string | undefined;
      if (response.status === "incomplete") {
        if (response.statusDetails?.type === "incomplete" && response.statusDetails?.reason) {
          const reason = response.statusDetails.reason;
          switch (reason) {
            case "max_output_tokens":
              message = "🚫 Max output tokens reached";
              break;
            case "content_filter":
              message = "🚫 Content filter applied";
              break;
            default:
              message = `🚫 Response incomplete: ${reason}`;
              break;
          }
        } else {
          message = "🚫 Response incomplete";
        }
      } else if (response.status === "failed") {
        if (response.statusDetails?.type === "failed" && response.statusDetails?.error) {
          switch (response.statusDetails.error.code) {
            case "server_error":
              message = `⚠️ Server error`;
              break;
            case "rate_limit_exceeded":
              message = `⚠️ Rate limit exceeded`;
              break;
            default:
              message = `⚠️ Response failed`;
              break;
          }
        } else {
          message = "⚠️ Response failed";
        }
      } else {
        return;
      }

      const localParticipant = ctx.room.localParticipant as LocalParticipant;
      const trackSid = getMicrophoneTrackSid(localParticipant);

      if (trackSid) {
        sendTranscription(
          ctx,
          localParticipant,
          trackSid,
          "status-" + uuidv4(),
          message,
        );
      }
    });
  } catch (error) {
    console.error("Error in runMultimodalAgent:", error);
  }
}

cli.runApp(new WorkerOptions({ 
  agent: fileURLToPath(import.meta.url)// Add this line
}));




