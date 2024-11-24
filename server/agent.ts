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
import { RoomEvent, DataPacketKind, RemoteParticipant } from "@livekit/rtc-node";
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
    // Handle data messages
    ctx.room.on('dataReceived', async (payload: Uint8Array, participant?: RemoteParticipant | undefined) => {
      if (participant && participant.identity.startsWith('agent-')) {
        // console.log('⏭️ Skipping message from agent');
        return;
      }

      try {
        const decoder = new TextDecoder();
        const rawData = decoder.decode(payload);
        const data = JSON.parse(rawData);
        
        // Handle onboarding control messages
        if (data.type === 'onboardingControl') {
          console.log('📥 Agent: Received onboarding control:', data);

          await session.conversation.item.create({
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: `User has completed onboarding. Please review their tasks and progress. Look at the tasks they've created, which ones have deadlines set, and which ones still need attention. Congratulate them on their progress and remind them you'll be here to help manage tasks and deadlines. Keep the tone friendly and encouraging.`
              },
            ],
          });
          
          await session.response.create();
          return;
        }

        if (data.type === 'taskUpdate') {
          // console.log('📝 Agent: Processing task update', {
          //   tasks: data.tasks,
          //   timestamp: new Date(data.timestamp).toISOString()
          // });

          await session.conversation.item.create({
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Current tasks state: ${JSON.stringify(data.tasks, null, 2)}\nPlease watch the latest task user created. Once user set name and description, congratulate him and encourage user to input deadlines for task. Explain that deadline is important for Dona to follow up on task. When deadline is set, tell user he is done for now, he will receive invite in calendar to a meeting and and Dona is gonna follow up on deadline date and there will be a session with the user to discuss the progress.Thank user and tell him he can close the tab and go now. Do not pronounce every part of the task like a parrot.`
              },
            ],
          });
          
          await session.response.create();
        }
      } catch (error) {
        console.error('❌ Agent: Error processing data message:', error);
      }
    });

    // Remove the old participantAttributesChanged listener for tasks
    // Keep the onboarding listener as is since it's not frequent
    ctx.room.on(
      "participantAttributesChanged",
      async (changedAttributes: Record<string, string>, changedParticipant: Participant) => {
        // Log all attribute changes for debugging
        console.log('🔄 Agent: Attributes changed:', {
          attributes: changedAttributes,
          participantId: changedParticipant.identity,
          repeatOnboarding: changedAttributes.repeatOnboarding
        });

        // Only handle onboarding requests
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

        // Log when onboarding is turned off
        if (changedAttributes.repeatOnboarding === 'false') {
          console.log('🔕 Agent: Onboarding turned off by user:', {
            participant: changedParticipant.identity,
            timestamp: new Date().toISOString()
          });
        } else {
          console.log('❓ Agent: Unhandled repeatOnboarding value:', changedAttributes.repeatOnboarding);
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