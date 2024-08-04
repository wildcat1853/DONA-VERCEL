import { NextApiResponse } from "next";
import { db, message } from "@/lib/db";
import { NextResponse } from "next/server";
import { MyToolInvocationType } from "@/lib/schemas";

export async function createMessage({
  content,
  projectId,
  role,
  toolInvocations,
}: {
  content: string;
  role: string;
  projectId: string;
  toolInvocations?: MyToolInvocationType[];
}) {
  try {
    const newMessage = await db
      .insert(message)
      .values({
        content,
        role: role as any,
        createdAt: new Date(),
        projectId,
        toolInvocations,
      })
      .returning();
    return newMessage;
  } catch (error) {
    console.log(error);
  }
}

export async function POST(req: Request, res: NextApiResponse) {
  const body = await req.json();
  try {
    const newMessage = await createMessage(body);
    return NextResponse.json(newMessage);
  } catch (error) {
    return NextResponse.json(
      { error: "Error creating newMessage" },
      { status: 500 }
    );
  }
}
