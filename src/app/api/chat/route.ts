import { NextResponse } from "next/server";

export async function GET(req: Request) {
  return NextResponse.json({ name: "works" });
}

import { openai } from "@ai-sdk/openai";
import { streamText, StreamData } from "ai";
import { systemPrompt } from "./systemPromt";
import { z } from "zod";
import { db, task } from "@/lib/db";
import { createMessage } from "../messages/helper";

export const maxDuration = 30;

const onBoardingMessages = [
  {
    content: "What's the project",
  },
  {
    content: "Where are you now?",
  },
  {
    content: "How long does it take time to finish?",
  },
  {
    content: "Tell me one small step that will bring you closer to",
  },
];

export async function POST(req: Request) {
  const json = await req.json();
  const { messages, projectId } = json;
  const data = new StreamData();
  createMessage({
    content: messages[messages.length - 1].content,
    projectId,
    role: "user",
  });
  data.append({ test: "value" });

  const result = await streamText({
    model: openai("gpt-4o"),
    tools: {
      createTask: {
        description: "Create a new task",
        parameters: z.object({
          title: z.string(),
          description: z.string(),
          deadline: z.string(),
        }),
        execute: async (data: {
          title: string;
          description: string;
          deadline: string;
        }) => {
          console.log(data);
          console.log("texgsd");
          try {
            const taskData = await db
              .insert(task)
              .values({
                name: data.title,
                description: data.description,
                status: "in progress",
                projectId,
                deadline: new Date(data.deadline),
              })
              .returning()
              .execute();
            console.log(taskData);
            return NextResponse.json(taskData);
          } catch (error) {
            console.log(error);
          }
        },
      },
    },

    onFinish(e) {
      data.close();
      console.log(e);
      createMessage({
        content: e.text,
        projectId,
        role: "assistant",
        //@ts-ignore
        toolInvocations: e.toolResults[0] ? e.toolResults : undefined,
      });
    },
    messages: [
      { role: "system", content: systemPrompt(new Date().toISOString()) },
      ...messages,
    ],
  });

  return result.toDataStreamResponse({ data });
}
