import { db } from "@/db/db";
import { user } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    await db
      .update(user)
      .set({ isOnboarding: 'false' })
      .where(eq(user.id, userId));

    console.log('[Onboarding] Set Status to False:', {
      userId
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Onboarding] Error setting status to false:', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
