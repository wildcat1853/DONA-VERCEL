import { NextApiRequest, NextApiResponse } from "next";
import { db, task } from "@/lib/db";
import { NextResponse } from "next/server";
import { eq, InferSelectModel } from "drizzle-orm";

export type Task = InferSelectModel<typeof task>;

export async function POST(req: Request, res: NextApiResponse) {
  const body = await req.json();
  try {
    const newTask = await db
      .insert(task)
      .values({
        name: body.name,
        status: body.status,
        description: body.description,
        deadline: new Date(body.deadline),
        projectId: body.projectId,
      })
      .returning();
    return NextResponse.json(newTask);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Error creating newTask" },
      { status: 500 }
    );
  }
}
