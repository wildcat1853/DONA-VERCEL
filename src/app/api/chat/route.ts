import { db, project, task } from "@/lib/db";
import { ENV } from "@/lib/env";
import { AssistantResponse } from "ai";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { RunSubmitToolOutputsParams } from "openai/resources/beta/threads/runs/runs.mjs";

const openai = new OpenAI({
  apiKey: ENV.OPENAI_API_KEY || "",
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request, res: NextResponse) {
  // Parse the request body
  const input: {
    threadId: string | null;
    message: string;
    projectId: string;
  } = await req.json();
  // Create a thread if needed
  const threadId = input.threadId ?? (await openai.beta.threads.create({})).id;

  // Add a message to the thread
  const createdMessage = await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: input.message,
  });

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
                      const projectData = await db
                        .select()
                        .from(project)
                        .where(eq(project.id, input.projectId));
                      if (!projectData.some((el) => el.id == input.projectId)) {
                        await db
                          .insert(project)
                          .values({
                            userId: "someUser",
                            id: input.projectId,
                          })
                          .execute();
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
                    } catch (e) {
                      console.log(e);
                      throw e;
                    }
                    console.log("create", parameters);
                    sendDataMessage({
                      role: "data",
                      data: {
                        text: "created task",
                      },
                    });
                    return {
                      tool_call_id: toolCall.id,
                      output: "done",
                    } satisfies RunSubmitToolOutputsParams.ToolOutput;
                  })();
                  break;
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
