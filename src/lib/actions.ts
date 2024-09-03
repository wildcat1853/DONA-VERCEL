// "use server";

// import { z } from "zod";
// import { project } from "./schemas";
// import { createInsertSchema } from "drizzle-zod";
// import { db } from "./db";
// import { revalidatePath } from "next/cache";
// import { redirect } from "next/navigation";
// import { cookies } from "next/headers";

// const insertProjectSchema = createInsertSchema(project).omit({
//   id: true,
//   createdAt: true,
//   name: true,
// });

// type a = z.infer<typeof insertProjectSchema>;

// export async function createProject(formData: FormData) {
//   try {
//     const userId = cookies().get("userId")?.value;
//     if (!userId) throw new Error("userId not found");
//     const newProject = await db
//       .insert(project)
//       .values({
//         name: "Project name",
//         userId: userId,
//         createdAt: new Date(),
//       })
//       .returning();
//     revalidatePath("/dashboard");
//     redirect("/chat/" + newProject[0].id);
//   } catch (e) {
//     console.error("cant create project", e);
//     throw e;
//   }
// }
