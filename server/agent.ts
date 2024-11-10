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
const OPENAI_ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

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
import type { Participant } from "@livekit/rtc-node";

import { Room, RoomServiceClient } from 'livekit-server-sdk';

// Initialize RoomServiceClient
const livekitHost = LIVEKIT_URL;
const roomService = new RoomServiceClient(livekitHost, LIVEKIT_API_KEY!, LIVEKIT_API_SECRET!);

function safeLogConfig(config: SessionConfig): string {
  const safeConfig = { ...config, openaiApiKey: "[REDACTED]", model: "[REDACTED]" };
  return JSON.stringify(safeConfig);
}

// Define shutdown hook
async function shutdownHook(roomName: string) {
  try {
    await roomService.deleteRoom(roomName);
    console.log(`Room '${roomName}' has been deleted successfully.`);
  } catch (error) {
    console.error(`Failed to delete room '${roomName}':`, error);
  }
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    console.log('🤖 Backend: Agent is starting...');

    try {
      await ctx.connect();
      // console.log('🔗 Backend: Agent connected to LiveKit server');
      // console.log('🏠 Backend: Current room:', ctx.room.name);
      
      // console.log('⏳ Backend: Waiting for participant...');
      const participant = await ctx.waitForParticipant();
      
      console.log('👤 Backend: Participant connected:', {
        identity: participant.identity,
        metadata: participant.metadata,
        userId: JSON.parse(participant.metadata || '{}')?.sessionConfig?.metadata?.userId || 'No userId found'
      });

      // Extract room name from participant metadata
      const metadata = JSON.parse(participant.metadata || '{}');
      const roomName: string = metadata.roomName || "default-room";

      // console.log('🎯 Backend: Extracted room name from metadata:', roomName);

      // Register the shutdown hook with the room name
      ctx.addShutdownCallback(() => shutdownHook(roomName));

      await runMultimodalAgent(ctx, participant, roomName);
    } catch (error) {
      console.error('💥 Backend: Error in agent:', error);
    }
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
  instructions: string;
}

function parseSessionConfig(data: any): SessionConfig {
  return {
    openaiApiKey: OPENAI_API_KEY || "",
    model: data.model || "gpt-4o-realtime-preview-2024-10-01", // Updated default model
    voice: data.voice || "",
    temperature: parseFloat(data.temperature || "0.8"),
    maxOutputTokens:
      data.max_output_tokens === "inf"
        ? Infinity
        : parseInt(data.max_output_tokens) || undefined,
    modalities: modalitiesFromString(data.modalities || "text_and_audio"),
    turnDetection: data.turn_detection ? JSON.parse(data.turn_detection) : undefined,
    instructions: data.instructions || '',
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

async function runMultimodalAgent(ctx: JobContext, participant: Participant, roomName: string) {
  try {
    const metadata = JSON.parse(participant.metadata || '{}');
    const config = parseSessionConfig(metadata);
    // const config = parseSessionConfig(metadata.sessionConfig || {});
    const isOnboarding = metadata.sessionConfig?.isOnboarding === true || metadata.isOnboarding === true;

    // console.log('[Onboarding] Backend Status:', isOnboarding ? 'Started' : 'Not in onboarding mode', {
    //   metadata: metadata, // Log the full metadata for debugging
    //   isOnboarding: isOnboarding
    // });
    // console.log('🔧 Backend: Agent configuration:', {
    //   roomName: roomName,
    //   model: config.model,
    //   voice: config.voice,
    //   modalities: config.modalities,
    //   isOnboarding: isOnboarding
    // });

    const model = new openai.realtime.RealtimeModel({
      apiKey: config.openaiApiKey,
      model: "gpt-4o-realtime-preview-2024-10-01",
      voice: config.voice,
      temperature: config.temperature,
      maxResponseOutputTokens: config.maxOutputTokens,
      modalities: config.modalities,
      turnDetection: config.turnDetection,
      instructions: config.instructions,
    });

    const agent = new multimodal.MultimodalAgent({ model });
    let session = (await agent.start(ctx.room)) as openai.realtime.RealtimeSession;

    // Simplify the conversation starter since instructions are now handled via config
    await session.conversation.item.create({
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text: "Start the conversation according to onboarding instructions.",
        },
      ],
    });
    await session.response.create();

    // await session.conversation.item.create({
    //   type: "message",
    //   role: "system",
    //   content: [
    //     {
    //       type: "input_text",
    //       text: "Do onboarding instructions.",
    //     },
    //   ],
    // });
    // await session.response.create();

    // Handle participant disconnection
    ctx.room.on(RoomEvent.ParticipantDisconnected, (disconnectedParticipant: Participant) => {
      if (disconnectedParticipant.identity === participant.identity) {
        console.log(`Participant ${participant.identity} disconnected.`);
        // Close the session and clean up
        session.close();
        // Optionally exit or wait for reconnection
      }
    });

    // Set up participant attribute change listener
    ctx.room.on(
      "participantAttributesChanged",
      async (changedAttributes: Record<string, string>, changedParticipant: Participant) => {
        console.log('🔄 Agent: Received attribute change:', {
          participantId: changedParticipant.identity,
          expectedId: participant.identity,
          attributes: changedAttributes,
          metadata: changedParticipant.metadata,
          isAgentIdentity: changedParticipant.identity.startsWith('agent-'),
          timestamp: new Date().toISOString()
        });

        // Skip agent events
        if (changedParticipant.identity.startsWith('agent-')) {
          console.log('⏭️ Agent: Skipping agent event');
          return;
        }

        // Handle task updates
        if (changedAttributes.taskUpdate === 'true') {
          try {
            console.log('📝 Agent: Processing task update');
            const taskData = JSON.parse(changedAttributes.taskData);
            console.log('📊 Agent: Task data received:', {
              taskCount: Array.isArray(taskData) ? taskData.length : 'not an array',
              tasks: taskData,
              timestamp: new Date(parseInt(changedAttributes.timestamp)).toISOString()
            });

            await session.conversation.item.create({
              type: "message",
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `Current tasks state: ${JSON.stringify(taskData, null, 2)}\nPlease provide feedback about the most currently created task. Remind user to input deadlines for tasks. If deadline was just input, ask if they want to add another task.`
                },
              ],
            });
            
            await session.response.create();
            console.log('✅ Agent: Sent task update to assistant');
          } catch (error) {
            console.error('❌ Agent: Error handling task update:', error);
          }
          return; // Return after handling task update
        }

        // Handle onboarding separately
        if (changedAttributes.repeatOnboarding === 'true') {
          console.log('🎯 Agent: Repeat onboarding request detected');
          try {
            console.log('Creating new conversation item...');
            await session.conversation.item.create({
              type: "message",
              role: "system",
              content: [
                {
                  type: "input_text",
                  text: "User has requested to repeat onboarding. Start fresh with onboarding instructions: introduce yourself as Dona, explain how the app works with task creation and deadlines, and guide them through getting started.",
                },
              ],
            });
            console.log('✅ Created conversation item');
            
            await session.response.create();
            console.log('✅ Response created');

            // Reset the flag
            // await changedParticipant.setAttributes({
            //   ...changedAttributes,
            //   repeatOnboarding: 'false'
            // });
          } catch (error) {
            console.error('❌ Agent: Error in onboarding sequence:', error);
          }
          return;
        }
      }
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