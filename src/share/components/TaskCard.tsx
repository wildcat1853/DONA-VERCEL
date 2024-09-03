"use client";
import React from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import { AlarmCheck } from "lucide-react";
import { TaskStatusType } from "@/lib/define";
import { toggleTaskStatus } from "@/app/actions/task";

type Props = {
  name: string;
  description: string | null;
  id: string;
  status: TaskStatusType;
  deadline: Date;
};

function TaskCard({ description, name, id, status, deadline }: Props) {
  return (
    <Card className="px-5 py-3 bg-gray-100 flex items-start gap-4">
      <Checkbox
        className="mt-2"
        checked={status == "done"}
        onClick={() => {
          console.log("click");
          toggleTaskStatus(id);
        }}
      />
      <div className="w-full">
        <p className="font-semibold">{name}</p>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
        <div className="w-full flex items-center justify-between mt-6">
          {status == "in progress" ? (
            <Badge className="bg-[#F9D4E8] text-[#323232]  ">
              <AlarmCheck className="size-4" />
              {new Date(deadline).toLocaleString()}
            </Badge>
          ) : (
            <Badge className="bg-[#59E7B3] text-[#323232] mt-6">
              In progress
            </Badge>
          )}
          <Button>Add to calendar</Button>
        </div>
      </div>
    </Card>
  );
}

export default TaskCard;
