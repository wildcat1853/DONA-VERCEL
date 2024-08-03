import { NextResponse } from "next/server";

export async function GET(req: Request) {
  return NextResponse.json({ name: "works" });
}

import { openai } from "@ai-sdk/openai";
import { streamText, StreamData } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const data = new StreamData();
  data.append({ test: "value" });

  const result = await streamText({
    model: openai("gpt-4-turbo"),
    onFinish() {
      data.close();
    },
    messages,
  });

  return result.toDataStreamResponse({ data });
}
