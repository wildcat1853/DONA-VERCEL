// "use client";
import React from "react";
import { Button } from "../ui/button";
import { createProject } from "@/lib/actions";

type Props = {};

function CreateProjectButton({}: Props) {
  // const createProject = async () => {
  //   const data: Project[] = await (
  //     await fetch(document.location.origin + "/api/projects", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ userId: userId }),
  //     })
  //   ).json();

  // };
  return (
    <form action={createProject}>
      <Button type="submit">Create new project</Button>
    </form>
  );
}

export default CreateProjectButton;
