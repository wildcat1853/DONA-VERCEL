"use server";
import { db } from "@/db/db";
import { user } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authConfig } from "@/app/api/auth/[...nextauth]/authConfig";

export default async function getServerUser() {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.email) {
      console.log('No authenticated session, redirecting to auth');
      redirect('/auth');
    }

    let userData = await db.query.user.findFirst({
      where: (user, { eq }) => eq(user.email, session.user.email),
    });

    if (!userData) {
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
    console.error('Auth or database error:', error);
    redirect('/auth');
  }
}
