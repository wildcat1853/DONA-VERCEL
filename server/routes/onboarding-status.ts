import { db } from "../../db";
import { user } from "../../schemas";
import { eq } from "drizzle-orm";

export async function getOnboardingStatus(userId: string) {
  try {
    if (!userId) {
      console.error('Missing userId in request');
      return { error: "Missing userId" };
    }

    const userData = await db.query.user.findFirst({
      where: eq(user.id, userId),
    });

    if (!userData) {
      console.error('No user found with ID:', userId);
      return { error: "User not found" };
    }

    return { 
      isOnboarding: userData.isOnboarding === 'true',
      userId: userData.id
    };
  } catch (error) {
    console.error('Database error:', error);
    return { error: "Internal Server Error" };
  }
}
