import { NextApiResponse } from "next";
import { NextResponse } from "next/server";
import { createMessage } from "./helper";

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
