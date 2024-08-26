import { db } from "@/lib/db";
import CreateProjectButton from "@/share/components/CreateProjectButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/share/ui/avatar";
import { Card } from "@/share/ui/card";
import React from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";

type Props = {};

async function page({}: Props) {
  redirect("/chat/" + nanoid(4));
  const userId = cookies().get("userId")?.value;

  const projects = await db.query.project.findMany({
    //@ts-ignore
    where: (project, { eq }) => eq(project.userId, userId),
  });
  console.log(projects);
  return (
    <main className="max-w-[700px] mx-auto">
      <div className="flex items-end justify-between mt-24">
        <div className="flex flex-col gap-3">
          <Avatar className="w-16 h-16">
            <AvatarImage src="https://s3-alpha-sig.figma.com/img/5fc7/ec20/ea720662bbdf4919d249c61963e54b80?Expires=1723420800&Key-Pair-Id=APKAQ4GOSFWCVNEHN3O4&Signature=d5pY5FyOI5moVLEpSy7PjO5l2H7S0l0VcJhb2qrt2ygJcvnl9s7ebxcgmFBjTrNcwjfV38xwYYBHZhCfAgoN6~6l7z~HIsd4Btn~c2AIu5Yu4Q5pnDxGozgA8yVOIibhBExfy03gRmMisiAzMYFuAHiEKpo5bKDpKuqvDJWR1CALq5AWaLR~-KDTP80pXDEkxxRCDNAXU~bdocwJ9Jm4oKIVxskJhOdQCaPqYdpUEQmfNfzJw59itrAjmUHptw2T00ca-2wDheO2cnmKp0ce0ixqeA0SS6Mo7i8szcp~C~xf1ndrcDrVOVgA978~rMiV8cyP87K9S65Bufd9bDWzkA__" />
            <AvatarFallback>DN</AvatarFallback>
          </Avatar>
          <p className="font-semibold text-2xl">Welcome to Dona AI</p>
        </div>
        <CreateProjectButton />
      </div>
      <p className="font-extrabold text-5xl mt-8">Your projects</p>
      <div className="grid grid-cols-2 gap-4 mt-10">
        {projects.map((el, i) => (
          <Link key={i} href={`/chat/${el.id}`}>
            <Card className="h-64 bg-gray-950 flex items-center justify-center cursor-pointer">
              <p className="font-semibold text-3xl text-white">{el.name}</p>
            </Card>
          </Link>
        ))}
        {/* {[1, 2, 3, 4, 5].map((el, i) => (
          <Skeleton key={i} className="h-64 bg-gray-300"></Skeleton>
        ))} */}
      </div>
    </main>
  );
}

export default page;
