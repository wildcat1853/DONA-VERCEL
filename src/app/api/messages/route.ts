import { NextApiRequest, NextApiResponse } from 'next';
import { db, message } from '@/lib/db';
import { NextResponse } from 'next/server';

export  async function POST(req: Request, res: NextApiResponse) {
  const body = await req.json();
    try {
      const newMessage = await db.insert(message).values({
        content: body.content,
        role: body.role,
        createdAt: new Date(),
        projectId: body.projectId,
      }).returning();
      return NextResponse.json(newMessage);
    } catch (error) {
      return NextResponse.json({ error: 'Error creating newMessage' }, { status: 500 });
    }
}