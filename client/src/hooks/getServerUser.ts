"use server";
import { authConfig } from "@/app/api/auth/[...nextauth]/authConfig";
import { db } from "@/../../../db";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { user } from "@/../../../schemas";
import { sql } from "drizzle-orm";

export default async function getServerUser() {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user) redirect("/auth")
    
    const sessionUser = session.user;
    if (!sessionUser.email) throw new Error("no email");
    if (!sessionUser.name) throw new Error("no name");
    
    const email = sessionUser.email;

    // Add a health check query first
    try {
      await db.execute(sql`SELECT 1`);
    } catch (dbError: any) {
      console.error('Database connection error details:', {
        message: dbError.message,
        code: dbError.code,
        stack: dbError.stack
      });
      throw new Error(`Database connection failed: ${dbError.message}`);
    }

    // Try to find the user
    let userData = await db.query.user.findFirst({
      where: (user, { eq }) => eq(user.email, email),
    });

    // If user doesn't exist, create new user
    if (!userData) {
      try {
        userData = (await db.insert(user).values({
          email: sessionUser.email,
          name: sessionUser.name,
          image: sessionUser.image,
        }).returning())[0];
      } catch (insertError) {
        console.error('Error creating new user:', insertError);
        throw new Error('Failed to create new user');
      }
    }

    return userData;
    
  } catch (error) {
    console.error('getServerUser error:', error);
    throw error;
  }
}
