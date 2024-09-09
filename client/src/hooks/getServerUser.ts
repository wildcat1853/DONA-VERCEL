"use server";
import { authConfig } from "@/app/api/auth/[...nextauth]/authConfig";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { user } from "@/lib/schemas";

export default async function getServerUser() {
  const session = await getServerSession(authConfig);
  if (!session?.user) redirect("/auth")
  const sessionUser = session.user
  if (!sessionUser.email) throw new Error("no email");
  if (!sessionUser.name) throw new Error("no name");
  const email = sessionUser.email;
  let userData = await db.query.user.findFirst({
    where: (user, { eq }) => eq(user.email, email),
  });
  if (!userData) {
    userData = (await db.insert(user).values({
      email: sessionUser.email,
      name: sessionUser.name,
      image: sessionUser.image,
    }).returning())[0];
  }
  return userData;
}
