import { db, message, task } from "@/../../../db";
import { Message } from "@/../../../define";
import { ENV } from "@/lib/env";
import { AssistantResponse } from "ai";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { RunSubmitToolOutputsParams } from "openai/resources/beta/threads/runs/runs.mjs";
import WebSocket from 'ws';

const openai = new OpenAI({
  apiKey: ENV.OPENAI_API_KEY || "",
});

const WS_SERVER_URL = process.env.WS_SERVER_URL || 'ws://localhost:8080';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request, res: NextResponse) {
  // Parse the request body
  const _input: {
    threadId: string | null;
    message: string;
    projectId: string;
  } = await req.json();
  const jsonMessage = JSON.parse(_input.message);
  const input = { threadId: _input.threadId, role: jsonMessage.role, message: jsonMessage.message, projectId: _input.projectId }
  // Create a thread if needed
  const threadId = input.threadId ?? (await openai.beta.threads.create({})).id;

  // Add a message to the thread
  let createdMessage: OpenAI.Beta.Threads.Messages.Message;
  let userDbMessagePromise: Promise<Message[]>;

  if (input.message != 'Hi') {
    createdMessage = await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: input.message,
    });
    if (input.role != 'system') {
      console.log(createdMessage.role)
      userDbMessagePromise = db.insert(message).values({
        content: input.message,
        projectId: input.projectId,
        role: input.role,
      }).returning()
    }
  } else {
    createdMessage = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: input.message + `
      today is: ${new Date().toLocaleString()}`,
    });
  }
  return AssistantResponse(
    { threadId, messageId: createdMessage.id },
    async ({ forwardStream, sendDataMessage }) => {
      // Run the assistant on the thread
      const runStream = openai.beta.threads.runs.stream(threadId, {
        assistant_id:
          ENV.ASSISTANT_ID ??
          (() => {
            throw new Error("ASSISTANT_ID is not set");
          })(),
      });

      if (input.role == 'system') return;
      runStream.on('end', async () => {
        console.log('before before before')
        //@ts-ignore
        const aiMessage = (await runStream.finalMessages())[0].content[0].text.value;
        const userDbMessage = await userDbMessagePromise
        const dbMessage = await db.insert(message).values({
          content: aiMessage,
          projectId: input.projectId,
          role: "assistant",
        })

        // Send the AI message to the WebSocket server for text-to-speech conversion
        try {
          const ws = new WebSocket(WS_SERVER_URL);
          ws.on('open', () => {
            ws.send(JSON.stringify({ type: 'tts_request', text: aiMessage }));
            ws.close();
          });
        } catch (error) {
          console.error('Failed to send message to WebSocket server:', error);
        }
      })

      // forward run status would stream message deltas
      let runResult = await forwardStream(runStream);
      console.log("before switch");



      // status can be: queued, in_progress, requires_action, cancelling, cancelled, failed, completed, or expired
      while (
        runResult?.status === "requires_action" &&
        runResult.required_action?.type === "submit_tool_outputs"
      ) {
        const tool_outputs =
          runResult.required_action.submit_tool_outputs.tool_calls.map(
            (toolCall: any) => {
              const parameters = JSON.parse(toolCall.function.arguments);
              console.log(toolCall.function.name);
              switch (toolCall.function.name) {
                // configure your tool calls here
                case "createTask":
                  return (async () => {
                    const PARAMETERS = parameters as {
                      mainTask: string;
                      subTasks: { name: string; deadline: string }[];
                    };
                    try {
                      const projectData = await db.query.project.findFirst({
                        where: (project, { eq }) => eq(project.id, input.projectId)
                      })
                      console.log(projectData);
                      if (!projectData) {
                        throw new Error("Project not found");
                      }
                      const tasks = await db
                        .insert(task)
                        .values(
                          PARAMETERS.subTasks.map(
                            (el) =>
                            ({
                              name: el.name,
                              projectId: input.projectId,
                              deadline: new Date(el.deadline),
                              status: "in progress",
                            } as const)
                          )
                        )
                        .returning();
                      const dbMessage = await db.insert(message).values({
                        content: "",
                        projectId: input.projectId,
                        role: "data",
                        toolInvocations: tasks
                      })
                    } catch (e) {
                      console.log(e);
                      throw e;
                    }
                    console.log("create", parameters);
                    sendDataMessage({
                      role: "data",
                      data: { text: "created task", },
                    });
                    return {
                      tool_call_id: toolCall.id,
                      output: "done",
                    } satisfies RunSubmitToolOutputsParams.ToolOutput;
                  })();
                  break;
                // case 'updateTask': return (async () => {
                //   const PARAMETERS = parameters as {
                //     projectId: string;
                //     mainTask: string;
                //     status: TaskStatusType
                //   };
                //   const tasks = await db.update(task).set({ status: PARAMETERS.status }).where(eq(task.id, PARAMETERS.projectId))
                // })();
                default:
                  return {
                    tool_call_id: toolCall.id,
                    output: "there is no such function",
                  };
                //   throw new Error(
                //     `Unknown tool call function: ${toolCall.function.name}`
                //   );
              }
            }
          );

        const toolOutputs = await Promise.all(tool_outputs);
        console.log("after toolOutputs");
        runResult = await forwardStream(
          openai.beta.threads.runs.submitToolOutputsStream(
            threadId,
            runResult.id,
            { tool_outputs: toolOutputs }
          )
        );
      }
    }
  );
}
