"use server";
import { db } from "@/db/db";
import { user } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function getServerUser() {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      console.log('No session or email, redirecting to auth');
      redirect('/auth');
    }

    // Try to find the user
    let userData = await db.query.user.findFirst({
      where: (user, { eq }) => eq(user.email, session.user.email!),
    });

    // If user doesn't exist, create one
    if (!userData) {
      console.log('User not found, creating new user');
      userData = (
        await db
          .insert(user)
          .values({
            email: session.user.email,
            name: session.user.name || 'Anonymous',
            image: session.user.image || '',
          })
          .returning()
      )[0];
    }

    return userData;
  } catch (error) {
    console.error('Database connection error:', error);
    redirect('/auth');
  }
}
