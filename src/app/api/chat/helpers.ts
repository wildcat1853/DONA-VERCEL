import { db } from "@/lib/db";
import { MyToolInvocationType } from "@/lib/define";
import { message } from "@/lib/schemas";

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
    throw error;
  }
}
