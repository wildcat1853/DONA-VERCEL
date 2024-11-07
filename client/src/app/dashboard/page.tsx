// import { db, project } from "@/../../../db";
// import CreateProjectButton from "@/share/components/CreateProjectButton";
// // Add this import
// import { Card } from "@/share/ui/card";
// import React from "react";
// import Link from "next/link";
// import { redirect } from "next/navigation";
// import getServerUser from "@/hooks/getServerUser";

// type Props = {};

// async function page({}: Props) {
//   const userData = await getServerUser();
//   const projectData = await db.query.project.findFirst({
//     where: (project, { eq }) => eq(project.userId, userData.id),
//   });

//   if (!projectData) {
//     const newProject = (
//       await db
//         .insert(project)
//         .values({
//           name: "My Project",
//           userId: userData.id,
//         })
//         .returning()
//     )[0];
//     redirect("/chat/" + newProject.id);
//   }
//   redirect("/chat/" + projectData.id);

//   const projects = await db.query.project.findMany({
//     //@ts-ignore
//     where: (project, { eq }) => eq(project.userId, userId),
//   });
//   console.log(projects);
//   return (
//     <main className="max-w-[700px] mx-auto">
//       <div className="flex items-end justify-between mt-24">
//         <div className="flex flex-col gap-3">
         
//           <p className="font-semibold text-2xl">Welcome to Dona AI</p>
//         </div>
//         <CreateProjectButton />
//       </div>
//       <p className="font-extrabold text-5xl mt-8">Your projects</p>
//       <div className="grid grid-cols-2 gap-4 mt-10">
//         {projects.map((el, i) => (
//           <Link key={i} href={`/chat/${el.id}`}>
//             <Card className="h-64 bg-gray-950 flex items-center justify-center cursor-pointer">
//               <p className="font-semibold text-3xl text-white">{el.name}</p>
//             </Card>
//           </Link>
//         ))}
//         {/* {[1, 2, 3, 4, 5].map((el, i) => (
//           <Skeleton key={i} className="h-64 bg-gray-300"></Skeleton>
//         ))} */}
//       </div>
//     </main>
//   );
// }

// export default page;
