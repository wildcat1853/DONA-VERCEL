import { db } from "@db";
import { user } from "@schemas";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { isOnboarding, userId } = await request.json();

    await db
      .update(user)
      .set({ isOnboarding: isOnboarding ? 'true' : 'false' })
      .where(eq(user.id, userId));

    console.log('[Onboarding] Updated Status:', {
      userId,
      isOnboarding
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Onboarding] Error updating status:', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
