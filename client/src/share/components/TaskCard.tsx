"use client";
import React from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import { AlarmCheck } from "lucide-react";
import { toggleTaskStatus } from "@/app/actions/task";
import { AssistantStatus } from "ai";
import { createEventURL } from "@/app/actions/calendar";
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';

type Props = {
  name: string;
  description: string | null;
  id: string;
  assistantStatus: AssistantStatus;
  deadline: Date;
} & (
  | { status: "done" }
  | { status: "in progress"; onCheckBoxCLick: () => void }
);

function formatDeadline(date: Date): string {
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`;
  } else if (isTomorrow(date)) {
    return `Tomorrow at ${format(date, 'h:mm a')}`;
  } else if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'h:mm a')}`;
  } else {
    return format(date, 'MMM d, h:mm a');
  }
}

function TaskCard(props: Props) {
  const { description, name, id, status, deadline, assistantStatus } = props;
  const formattedDeadline = formatDeadline(new Date(deadline));

  return (
    <Card className="px-5 py-3 bg-gray-100 flex items-start gap-4">
      <Checkbox
        className="mt-2 w-6 h-6"
        disabled={assistantStatus != "awaiting_message"}
        checked={status == "done"}
        onClick={() => {
          console.log("click");
          toggleTaskStatus(id);
          if (status == "in progress") props.onCheckBoxCLick();
        }}
      />
      <div className="w-full">
        <p className="font-semibold">{name}</p>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
        <div className="w-full flex items-center justify-between mt-6">
          {status == "in progress" ? (
            <Badge className="bg-[#F9D4E8] text-[#323232]  ">
              <AlarmCheck className="size-4 mr-1" />
              {formattedDeadline}
            </Badge>
          ) : (
            <Badge className="bg-[#59E7B3] text-[#323232]">Done</Badge>
          )}
          <Button
            onClick={async () => {
              window.open(
                await createEventURL({
                  title: name,
                  start: new Date(),
                  end: deadline,
                })
              );
            }}
          >
            Add to calendar
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default TaskCard;
