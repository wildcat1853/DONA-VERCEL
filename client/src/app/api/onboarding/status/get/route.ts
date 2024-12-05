import { db } from "@/db/db";
import { user } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { headers } from 'next/headers';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      console.error('Missing userId in request');
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    console.log('Fetching user with ID:', userId);
    
    const userData = await db.query.user.findFirst({
      where: eq(user.id, userId),
    });

    console.log('Found user data:', userData);

    if (!userData) {
      console.error('No user found with ID:', userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const response = { 
      isOnboarding: userData.isOnboarding === 'true',
      userId: userData.id // Include this for debugging
    };

    console.log('Sending response:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 