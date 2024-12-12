// SPDX-License-Identifier: Apache-2.0

// Load environment variables from .env.local
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Determine the directory of agent.ts
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local in the root directory
dotenv.config({ path: join(__dirname, ".env.local") });

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

// Add Task type at the top of the file
interface Task {
  name: string;
  status: string;
  deadline: string;
  description?: string;
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    console.log('🤖 Agent starting...');

    try {
      // 1. Simple connection
      await ctx.connect();
      const participant = await ctx.waitForParticipant();
      
      // 2. Basic session setup
      const metadata = JSON.parse(participant.metadata || '{}');
      const config = parseSessionConfig(metadata);
      
      // 3. Initialize OpenAI model
      const model = new openai.realtime.RealtimeModel({
        apiKey: config.openaiApiKey,
        model: config.model,
        voice: config.voice,
        temperature: config.temperature,
        instructions: config.instructions,
      });

      const agent = new multimodal.MultimodalAgent({ model });
      const session = await agent.start(ctx.room);

      // 4. Simple data handler
      ctx.room.on('dataReceived', async (
        payload: Uint8Array,
        participant?: RemoteParticipant,
        kind?: DataPacketKind,
        topic?: string
      ) => {
        if (participant?.identity.startsWith('agent-')) {
          console.log('👻 Ignoring message from agent:', participant.identity);
          return;
        }
        
        try {
          const decoder = new TextDecoder();
          const data = JSON.parse(decoder.decode(payload));
          console.log('📨 Received message type:', data.type);
          
          switch (data.type) {
            case 'initialTasks':
              console.log('📋 Processing initial tasks');
              const tasks = (data.tasks || []) as Task[];
              console.log('📊 Raw tasks count:', tasks.length);
              
              const relevantTasks = tasks
                .filter((task: Task) => {
                  const isNotDone = task.status !== 'done';
                  console.log(`Task "${task.name}": status=${task.status}, included=${isNotDone}`);
                  return isNotDone;
                })
                .slice(0, 5);
              
              console.log('✅ Filtered tasks:', {
                total: tasks.length,
                filtered: relevantTasks.length,
                tasks: relevantTasks.map(task => ({
                  name: task.name,
                  status: task.status,
                  deadline: new Date(task.deadline).toLocaleDateString()
                }))
              });
              
              await session.conversation.item.create({
                type: "message",
                role: "user",
                content: [{
                  type: "input_text",
                  text: relevantTasks.length > 0 
                    ? `Here are your current tasks:\n${relevantTasks.map((t: { name: string; deadline: string }) => 
                        `- "${t.name}" (due: ${new Date(t.deadline).toLocaleDateString()})`
                      ).join('\n')}`
                    : "No active tasks. Let's create one!"
                }]
              });       
              break;
          }
        } catch (error) {
          console.error('❌ Error processing message:', error);
        }
      });

      // Register the shutdown hook with the room name
      ctx.addShutdownCallback(() => shutdownHook(ctx.room.name));

    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  }
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

interface Task {
  name: string;
  description?: string;
  status: string;
  deadline: string;
  createdAt: string;
}

// function getRelevantTasks(tasks: Task[], limit: number = 5) {
//   const relevantTasks = tasks
//     .filter(task => {
//       // Filter out completed tasks
//       if (task.status === 'done') return false;
      
//       // Include all tasks with a deadline
//       return task.deadline != null;
//     })
//     .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
//     .slice(0, limit);

//   console.log('📋 Filtered tasks:', {
//     total: tasks.length,
//     nonCompleted: tasks.filter(t => t.status !== 'done').length,
//     relevant: relevantTasks.length
//   });

//   return relevantTasks;
// }

function getRelevantTasks(tasks: Task[], limit: number = 5) {
  const now = new Date();
  
  const relevantTasks = tasks
    .filter(task => {
      // Skip completed tasks
      if (task.status === 'done') {
        console.log(`Task "${task.name}" skipped (status: done)`);
        return false;
      }
      return true;
    })
    .map(task => ({
      ...task,
      // Calculate time difference in milliseconds
      timeToDeadline: Math.abs(new Date(task.deadline).getTime() - now.getTime())
    }))
    // Sort by closest to current time (regardless if it's past or future)
    .sort((a, b) => a.timeToDeadline - b.timeToDeadline)
    // Take first 5
    .slice(0, limit)
    // Remove the timeToDeadline property we added for sorting
    .map(({ timeToDeadline, ...task }) => task);

  console.log('📋 Filtered tasks:', {
    total: tasks.length,
    nonCompleted: tasks.filter(t => t.status !== 'done').length,
    relevant: relevantTasks.length,
    selectedTasks: relevantTasks.map(t => ({
      name: t.name,
      deadline: new Date(t.deadline).toLocaleDateString()
    }))
  });

  return relevantTasks;
}

async function runMultimodalAgent(ctx: JobContext, participant: Participant, roomName: string) {
  try {
    const metadata = JSON.parse(participant.metadata || '{}');
    const config = parseSessionConfig(metadata);
    let currentTasks: Task[] = [];
    
    // Keep room alive
    let isProcessing = true;
    const keepAliveInterval = setInterval(() => {
      if (isProcessing && ctx.room) {
        console.log('🔄 Keeping room alive while processing tasks...');
      }
    }, 10000); // Check every 10 seconds

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

    // Get onboarding status from metadata
    const isOnboarding = metadata?.sessionConfig?.metadata?.isOnboarding || false;
    
    // Wait for initial tasks data with longer timeout
    if (!isOnboarding) {
      console.log('🔄 Waiting for initial tasks data...');
      try {
        await new Promise<void>((resolve, reject) => {
          const handleInitialTasks = async (payload: Uint8Array, sender?: RemoteParticipant) => {
            if (sender?.identity.startsWith('agent-')) return;
            
            try {
              const decoder = new TextDecoder();
              const data = JSON.parse(decoder.decode(payload));
              
              if (data.type === 'initialTasks') {
                console.log('📥 Received initial tasks data');
                currentTasks = data.tasks || [];
                const relevantTasks = getRelevantTasks(currentTasks);
                
                await session.conversation.item.create({
                  type: "message",
                  role: "user",
                  content: [{
                    type: "input_text",
                    text: relevantTasks.length > 0 
                      ? `Here are your most relevant tasks:\n${relevantTasks.map(task => `
- "${task.name}" (${task.status})
  Due: ${new Date(task.deadline).toLocaleDateString()}
  Description: ${task.description || 'No description'}`).join('\n')}\n\nPlease review these tasks. Focus on any tasks that are overdue or due today.`
                      : "Let's create a new task."
                  }]
                });
                await session.response.create();
                
                ctx.room.off('dataReceived', handleInitialTasks);
                resolve();
              }
            } catch (error) {
              console.error('❌ Error processing initial tasks:', error);
              reject(error);
            }
          };
          
          ctx.room.on('dataReceived', handleInitialTasks);
          
          // Increase timeout to 30 seconds
          setTimeout(() => {
            ctx.room.off('dataReceived', handleInitialTasks);
            reject(new Error('Timeout waiting for initial tasks'));
          }, 30000);
        });
      } catch (error) {
        console.error('❌ Failed to process initial tasks:', error);
        // Continue with the session even if initial tasks failed
      }
    } else {
      // Send onboarding prompt immediately
      await session.conversation.item.create({
        type: "message",
        role: "system",
        content: [{
          type: "input_text",
          text: "Start with onboarding instructions: introduce yourself as Dona, explain how the app works with task creation and deadlines, and guide them through getting started.",
        }]
      });
      await session.response.create();
    }

    // Clear the keep-alive interval
    isProcessing = false;
    clearInterval(keepAliveInterval);

    // Handle participant disconnection
    ctx.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      if (participant.identity === participant.identity) {
        console.log(`Participant ${participant.identity} disconnected.`);
        // Close the session and clean up
        session.close();
        // Optionally exit or wait for reconnection
      }
    });

    // Handle data messages
    ctx.room.on('dataReceived', async (payload: Uint8Array, participant?: RemoteParticipant | undefined) => {
      if (participant && participant.identity.startsWith('agent-')) {
        return;
      }

      try {
        const decoder = new TextDecoder();
        const rawData = decoder.decode(payload);
        const data = JSON.parse(rawData);
        
        if (data.type === 'taskUpdate') {
          currentTasks = data.tasks || [];
          const relevantTasks = getRelevantTasks(currentTasks);

          await session.conversation.item.create({
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Here are your most relevant tasks:
${relevantTasks.map(task => `
- "${task.name}" (${task.status})
  Due: ${new Date(task.deadline).toLocaleDateString()}
  Description: ${task.description || 'No description'}`).join('\n')}

Please watch the latest task user created. Once user set name and description, congratulate them and encourage them to input deadlines for task. Explain that deadline is important for Dona to follow up on task.`
              },
            ],
          });
          
          await session.response.create();
        }
      } catch (error) {
        console.error('❌ Agent: Error processing data message:', error);
      }
    });

    // Handle participant attribute changes
    ctx.room.on(
      "participantAttributesChanged",
      async (changedAttributes: Record<string, string>, changedParticipant: Participant) => {
        if (changedAttributes.repeatOnboarding === 'true') {
          console.log('🎯 Agent: Repeat onboarding request detected');
          try {
            await session.conversation.item.create({
              type: "message",
              role: "system",
              content: [{
                type: "input_text",
                text: "User has requested to repeat onboarding. Start fresh with onboarding instructions: introduce yourself as Dona, explain how the app works with task creation and deadlines, and guide them through getting started.",
              }],
            });
            await session.response.create();
          } catch (error) {
            console.error('❌ Agent: Error in manual onboarding sequence:', error);
          }
        }
      }
    );

    // Handle session close events
    session.on('close', async (code: number, reason: string) => {
      console.error(`OpenAI Realtime connection closed: [${code}] ${reason}`);
      process.exit(0);
    });

    // Handle session errors
    session.on('error', async (error: any) => {
      console.error('Session error:', error);
    });

  } catch (error) {
    console.error("Error in runMultimodalAgent:", error);
  }
}

cli.runApp(new WorkerOptions({
  agent: fileURLToPath(import.meta.url)
}));