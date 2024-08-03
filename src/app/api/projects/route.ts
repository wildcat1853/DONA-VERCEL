import { NextApiRequest, NextApiResponse } from 'next';
import { db, project } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(){
return NextResponse.json({data:'klskjdls'})
}

export  async function POST(req: Request, res: NextApiResponse) {
    const body = await req.json();
    try {
      const newProject = await db.insert(project).values({
        name: body.name,
        userId: body.userId,
        createdAt: new Date(),
      }).returning();
      return NextResponse.json(newProject);
    } catch (error) {
      return NextResponse.json({ error: 'Error creating project' }, { status: 500 });
    }
  
}