"use client";
import React from "react";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { Project } from "@/app/api/projects/route";
import { getUserId } from "./UserIdMiddleWare";

type Props = {};

function CreateProjectButton({}: Props) {
  const router = useRouter();

  const userId = getUserId();
  const createProject = async () => {
    const data: Project[] = await (
      await fetch(document.location.origin + "/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
        }),
      })
    ).json();

    router.refresh();
    router.push("/chat/" + data[0].id);
  };
  return (
    <Button
      onClick={() => {
        createProject();
      }}
    >
      Create new project
    </Button>
  );
}

export default CreateProjectButton;
