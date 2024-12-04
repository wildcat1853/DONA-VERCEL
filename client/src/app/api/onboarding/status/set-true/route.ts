import { db } from "@/db/db";
import { user } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      console.error('Missing userId in request body');
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    console.log('[Onboarding] Setting status to true for userId:', userId);

    const result = await db
      .update(user)
      .set({ isOnboarding: 'true' })
      .where(eq(user.id, userId));

    console.log('[Onboarding] Update result:', result);

    // Fetch the updated user to confirm the change
    const updatedUser = await db.query.user.findFirst({
      where: eq(user.id, userId),
    });

    console.log('[Onboarding] Updated user data:', updatedUser);

    return NextResponse.json({ 
      success: true,
      isOnboarding: updatedUser?.isOnboarding === 'true',
      userId 
    });
  } catch (error) {
    console.error('[Onboarding] Error setting status to true:', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
