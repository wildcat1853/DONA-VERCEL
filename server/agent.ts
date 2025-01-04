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
    
    // First handle initial conversation
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
                  role: llm.ChatRole.SYSTEM,
                  text: `Use instructions per scenario 2 - Review instructions. Here are your most relevant tasks:\n${relevantTasks.map(task => `
- "${task.name}" (${task.status})
  Due: ${new Date(task.deadline).toLocaleDateString()}
  Description: ${task.description || 'No description'}`).join('\n')}\n\nPlease review these tasks. Focus on any tasks that are overdue or due today.`
                }));
              } else {
                session.conversation.item.create(llm.ChatMessage.create({
                  role: llm.ChatRole.SYSTEM,
                  text: "Use instructions per scenario 1 - Onboarding instructions."
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

    // Only after initial tasks are handled, set up other listeners
    ctx.room.on('dataReceived', async (payload: Uint8Array, participant?: RemoteParticipant) => {
      if (participant?.identity.startsWith('agent-')) return;

      try {
        const decoder = new TextDecoder();
        const data = JSON.parse(decoder.decode(payload));
        
        if (data.type === 'taskUpdate') {
          const tasks = data.tasks || [];
          
          // Log raw task data with focus on deadline
          tasks.forEach((task: any, index: number) => {
            console.log(`Task ${index + 1} deadline:`, {
              raw: task.deadline,
              parsed: task.deadline ? new Date(task.deadline) : 'no deadline',
              taskName: task.name,
              allData: task
            });
          });
          
          const relevantTasks = getRelevantTasks(tasks);
          console.log('Relevant tasks with deadlines:', relevantTasks.map(task => ({
            name: task.name,
            deadline: task.deadline,
            parsedDeadline: new Date(task.deadline).toLocaleDateString()
          })));

          session.conversation.item.create(llm.ChatMessage.create({
            role: llm.ChatRole.SYSTEM,
            text: `Use instructions per scenario 3 - Task creation instructions. Here is the context of task in the process of creation:\n${relevantTasks.map(task => `
- "${task.name}" (${task.status})
  Due: ${new Date(task.deadline).toLocaleDateString()}
  Description: ${task.description || 'No description'}`).join('\n')}

Please watch the latest task user created. Once user set name and description, congratulate them and encourage them to input deadlines for task. Explain that deadline is important for Dona to follow up on task.`
          }));
          
          session.response.create();
        }
      } catch (error) {
        console.error('❌ Error processing task update:', error);
      }
    });

    // Then set up silence detection
    let lastMessageTime = Date.now();
    let isAgentSpeaking = false;
    const SILENCE_THRESHOLD = 605000; // 15 seconds

    session.on('message', () => {
      lastMessageTime = Date.now();
    });

    session.on('speaking', (speaking: boolean) => {
      isAgentSpeaking = speaking;
      if (speaking) {
        lastMessageTime = Date.now();
      }
    });

    session.on('responseStart', () => {
      isAgentSpeaking = true;
    });

    session.on('responseEnd', () => {
      isAgentSpeaking = false;
      lastMessageTime = Date.now();
    });

    const silenceChecker = setInterval(() => {
      const timeSinceLastMessage = Date.now() - lastMessageTime;
      
      if (timeSinceLastMessage > SILENCE_THRESHOLD && !isAgentSpeaking) {
        console.log('📢 Silence detected, prompting agent...');
        
        session.conversation.item.create(llm.ChatMessage.create({
          role: llm.ChatRole.ASSISTANT,
          text: "I notice we've been quiet for a moment. Would you like to discuss your tasks or is there something specific I can help you with?"
        }));
        
        session.response.create();
        lastMessageTime = Date.now();
      }
    }, 5000);

    session.on('close', () => {
      clearInterval(silenceChecker);
    });

    // Keep the session alive
    await new Promise(() => {});
  }
});

// Keep original getRelevantTasks function
function getRelevantTasks(tasks: Task[], limit: number = 5) {
  const now = new Date();
  
  const relevantTasks = tasks
    .map(task => ({
      ...task,
      timeToDeadline: Math.abs(new Date(task.deadline).getTime() - now.getTime())
    }))
    .sort((a, b) => a.timeToDeadline - b.timeToDeadline)
    .slice(0, limit)
    .map(({ timeToDeadline, ...task }) => task);

  console.log('📋 All tasks:', {
    total: tasks.length,
    inProgress: tasks.filter(t => t.status === 'in progress').length,
    completed: tasks.filter(t => t.status === 'done').length,
    selected: relevantTasks.map(t => ({
      name: t.name,
      status: t.status,
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