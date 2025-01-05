// SPDX-License-Identifier: Apache-2.0
import {
  JobContext,
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
  id: string;
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

// Add TaskUpdate interface
interface TaskUpdate {
  type: string;
  tasks: Task[];
  timestamp: number;
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
                const { relevantTasks, recentlyCompleted } = getRelevantTasks(tasks);
                
                let prompt = '';
                if (relevantTasks.length > 0) {
                  prompt = `Use instructions per scenario 2 - Review instructions. Here are your most relevant tasks:\n${relevantTasks.map(task => `
- "${task.name}" (${task.status})
  Due: ${task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
  Description: ${task.description || 'No description'}`).join('\n')}`;

                  if (recentlyCompleted.length > 0) {
                    prompt += `\n\nI see you recently completed: "${recentlyCompleted[0].name}". Great work! Let's focus on your remaining tasks.`;
                  }
                  
                  prompt += '\n\nPlease review these tasks. Focus on any tasks that are overdue or due today.';
                } else if (recentlyCompleted.length > 0) {
                  prompt = `I see you just completed "${recentlyCompleted[0].name}". Great work! Would you like to start a new task?`;
                }

                session.conversation.item.create(llm.ChatMessage.create({
                  role: llm.ChatRole.SYSTEM,
                  text: prompt || "Use instructions per scenario 1 - Onboarding instructions."
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

    // Add this variable at the entry level to track previous state
    let previousTasks: Task[] = [];

    // Only after initial tasks are handled, set up other listeners
    ctx.room.on('dataReceived', async (payload: Uint8Array, participant?: RemoteParticipant) => {
      if (participant?.identity.startsWith('agent-')) return;

      try {
        const decoder = new TextDecoder();
        const data = JSON.parse(decoder.decode(payload)) as TaskUpdate;
        
        if (data.type === 'taskUpdate') {
          const currentTasks = data.tasks || [];
          
          // Find newly completed tasks
          const newlyCompletedTask = previousTasks.find(prevTask => {
            const currentTask = currentTasks.find(t => t.id === prevTask.id);
            return prevTask.status === 'in progress' && currentTask?.status === 'done';
          });

          if (newlyCompletedTask) {
            // Task was just completed, acknowledge it
            session.conversation.item.create(llm.ChatMessage.create({
              role: llm.ChatRole.SYSTEM,
              text: `Great job completing "${newlyCompletedTask.name}"! 🎉 Would you like to start working on another task?`
            }));
            session.response.create();
          } else {
            // Handle regular task updates as before
            const { relevantTasks, recentlyCompleted } = getRelevantTasks(currentTasks);
            
            if (relevantTasks.length > 0) {
              const latestTask = relevantTasks[0];
              
              let prompt = `Use instructions per scenario 3 - Task creation instructions. Here is the latest task in progress:\n
- "${latestTask.name}" (${latestTask.status})
  Description: ${latestTask.description || 'No description'}
  Due: ${latestTask.deadline ? new Date(latestTask.deadline).toLocaleDateString() : 'No deadline set'}\n`;

              if (!latestTask.deadline) {
                prompt += "\nI notice this task doesn't have a deadline. Would you like me to help you set one?";
              } else if (!latestTask.description) {
                prompt += "\nWould you like to add a description to provide more context for this task?";
              } else {
                prompt += "\nThe task looks well-defined with both a deadline and description. Is there anything else you'd like me to help you with?";
              }

              session.conversation.item.create(llm.ChatMessage.create({
                role: llm.ChatRole.SYSTEM,
                text: prompt
              }));
              session.response.create();
            }
          }

          // Update previous tasks for next comparison
          previousTasks = currentTasks;
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
function getRelevantTasks(tasks: Task[]) {
  const now = new Date();
  
  // Get tasks in progress for active management
  const tasksInProgress = tasks.filter(t => t.status === 'in progress');
  
  // Get recently completed tasks, sort by deadline if available
  const recentlyCompleted = tasks
    .filter(t => t.status === 'done')
    .sort((a, b) => {
      const dateA = b.deadline ? new Date(b.deadline).getTime() : 0;
      const dateB = a.deadline ? new Date(a.deadline).getTime() : 0;
      return dateA - dateB;
    })
    .slice(0, 1); // Just get the most recent one

  // For active management, prioritize by deadline
  const relevantTasks = tasksInProgress
    .map(task => ({
      ...task,
      timeToDeadline: task.deadline ? Math.abs(new Date(task.deadline).getTime() - now.getTime()) : Infinity
    }))
    .sort((a, b) => a.timeToDeadline - b.timeToDeadline)
    .slice(0, 5)
    .map(({ timeToDeadline, ...task }) => task);

  console.log('📋 Tasks Status:', {
    total: tasks.length,
    inProgress: tasksInProgress.length,
    completed: tasks.filter(t => t.status === 'done').length,
    currentlyProcessing: relevantTasks.map(t => ({
      name: t.name,
      status: t.status,
      deadline: t.deadline ? new Date(t.deadline).toLocaleDateString() : 'no deadline'
    })),
    recentlyCompleted: recentlyCompleted.map(t => ({
      name: t.name,
      deadline: t.deadline ? new Date(t.deadline).toLocaleDateString() : 'no deadline'
    }))
  });

  return {
    relevantTasks,
    recentlyCompleted
  };
}

console.log('📡 Starting server...');
cli.runApp(new WorkerOptions({ 
  agent: fileURLToPath(import.meta.url),
  port: parseInt(process.env.PORT || '8081', 10),
  host: '0.0.0.0'
}));

export default worker;