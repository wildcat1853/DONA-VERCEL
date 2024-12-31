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
import { RemoteParticipant } from '@livekit/rtc-node';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Basic env setup
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env.local');
dotenv.config({ path: envPath });

// Add Task interface
interface Task {
  name: string;
  status: string;
  deadline: string;
  description?: string;
}

// Add parseSessionConfig function
function parseSessionConfig(data: any) {
  return {
    model: data.model || "gpt-4",
    voice: data.voice || "",
    temperature: parseFloat(data.temperature || "0.8"),
    instructions: data.instructions || '',
  };
}

const worker = defineAgent({
  entry: async (ctx: JobContext) => {
    console.log('🔌 Connecting to LiveKit...');
    await ctx.connect();
    console.log('✅ Connected to LiveKit');
    
    const participant = await ctx.waitForParticipant();
    console.log(`✅ Starting agent for ${participant.identity}`);

    const metadata = JSON.parse(participant.metadata || '{}');
    const config = parseSessionConfig(metadata);
    
    const model = new openai.realtime.RealtimeModel({
      apiKey: process.env.OPENAI_API_KEY,
      ...config
    });

    const agent = new multimodal.MultimodalAgent({ model });
    const session = await agent
      .start(ctx.room, participant)
      .then((session) => session as openai.realtime.RealtimeSession);

    console.log('💬 Waiting for initial tasks data...');
    
    try {
      await new Promise<void>((resolve, reject) => {
        const handleInitialTasks = async (payload: Uint8Array, sender?: RemoteParticipant) => {
          if (sender?.identity.startsWith('agent-')) return;
          
          try {
            const decoder = new TextDecoder();
            const data = JSON.parse(decoder.decode(payload));
            
            if (data.type === 'initialTasks') {
              const tasks = data.tasks || [];
              console.log(`📊 Received ${tasks.length} tasks`);
              
              if (tasks.length > 0) {
                const relevantTasks = getRelevantTasks(tasks);
                session.conversation.item.create(llm.ChatMessage.create({
                  role: llm.ChatRole.USER,
                  text: `Please talk according to scenario 2 per instruction. Here is the context of tasks:\n${relevantTasks.map(task => `
- "${task.name}" (${task.status})
  Due: ${new Date(task.deadline).toLocaleDateString()}
  Description: ${task.description || 'No description'}`).join('\n')}\n\n`
                }));
              } else {
                session.conversation.item.create(llm.ChatMessage.create({
                  role: llm.ChatRole.USER,
                  text: "Please talk according to scenario 1 per instruction"
                }));
              }
              
              session.response.create();
              ctx.room.off('dataReceived', handleInitialTasks);
              resolve();
            }
          } catch (error) {
            console.error('❌ Error processing initial tasks:', error);
            reject(error);
          }
        };
        
        ctx.room.on('dataReceived', handleInitialTasks);
        setTimeout(() => {
          ctx.room.off('dataReceived', handleInitialTasks);
          reject(new Error('Timeout waiting for initial tasks'));
        }, 60000);
      });
    } catch (error) {
      console.error('❌ Failed to process initial tasks:', error);
    }

    // Keep the session alive
    await new Promise(() => {});
  }
});

// Keep original getRelevantTasks function
function getRelevantTasks(tasks: Task[], limit: number = 5) {
  const now = new Date();
  
  const relevantTasks = tasks
    .filter(task => {
      if (task.status === 'done') {
        console.log(`Task "${task.name}" skipped (status: done)`);
        return false;
      }
      return true;
    })
    .map(task => ({
      ...task,
      timeToDeadline: Math.abs(new Date(task.deadline).getTime() - now.getTime())
    }))
    .sort((a, b) => a.timeToDeadline - b.timeToDeadline)
    .slice(0, limit)
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

console.log('📡 Starting server...');
cli.runApp(new WorkerOptions({ 
  agent: fileURLToPath(import.meta.url),
  port: parseInt(process.env.PORT || '8081', 10),
  host: '0.0.0.0'
}));

export default worker;