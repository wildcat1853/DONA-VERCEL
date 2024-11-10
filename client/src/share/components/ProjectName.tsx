"use client";
import React, { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { useDebounce } from "use-debounce";
import { saveProject } from "@/app/actions/project";
import Image from 'next/image';
import start from '@/../public/stars.svg';

type Props = {
  initialName: string;
  projectId: string;
  className?: string;
};

function ProjectName({ initialName, projectId, className }: Props) {
  const [name, setName] = useState(initialName);
  const [debouncedName] = useDebounce(name, 1000);

  useEffect(() => {
    if (debouncedName !== initialName) {
      saveProject({ id: projectId, name: debouncedName });
    }
  }, [debouncedName, initialName, projectId]);

  return (
    <div className={`flex gap-4 ${className}`}>
      <Image src={start} alt="stars" />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="font-semibold text-5xl tracking-tight focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-transparent border-none shadow-none bg-transparent w-auto p-0"
        placeholder="Project name"
      />
    </div>
  );
}

export default ProjectName;
