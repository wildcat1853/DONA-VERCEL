import { Task } from "@/app/api/tasks/route";
import React from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";

type Props = { name: string; description: string | null; id: string };

export function CardProgress({ description, name, id }: Props) {
  return (
    <Card className="p-4 ">
      <p>{name}</p>
      <p className="mt-2">{description}</p>
      <Badge className="bg-[#E7D059] text-[#323232] mt-6">In progress</Badge>
    </Card>
  );
}

export function CardDone({ description, name, id }: Props) {
  return (
    <Card className="p-4 ">
      <p>{name}</p>
      <p className="mt-2">{description}</p>
      <Badge className="bg-[#59E7B3] text-[#323232] mt-6">In progress</Badge>
    </Card>
  );
}
