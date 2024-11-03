"use client";
import React, { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import { AlarmCheck } from "lucide-react";
import { toggleTaskStatus } from "@/app/actions/task";
import { AssistantStatus } from "ai";
import { createEventURL } from "@/app/actions/calendar";
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
// Removed the problematic imports
import { useDebounce } from "use-debounce";
import { saveTask } from "@/app/actions/task";
import { Task } from "../../../../define";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

type Props = {
  name: string;
  description: string | null;
  id: string;
  assistantStatus: AssistantStatus;
  deadline: Date;
  onUpdate?: (task: Task) => void;
  projectId: string;
  createdAt: Date;
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
  const { description, name, id, status, deadline, assistantStatus, onUpdate, projectId, createdAt } = props;
  const [localName, setLocalName] = useState(name);
  const [localDescription, setLocalDescription] = useState(description || "");
  
  const [debouncedName] = useDebounce(localName, 1000);
  const [debouncedDescription] = useDebounce(localDescription, 1000);

  // Auto-save when debounced values change
  useEffect(() => {
    if (debouncedName !== name || debouncedDescription !== description) {
      const updatedTask = {
        id,
        name: debouncedName,
        description: debouncedDescription,
        status,
        deadline,
        projectId,
        createdAt
      };
      saveTask(updatedTask);
      onUpdate?.(updatedTask);
    }
  }, [debouncedName, debouncedDescription, name, description, id, status, deadline, projectId, createdAt, onUpdate]);

  const formattedDeadline = formatDeadline(new Date(deadline));

  return (
    <Card className="px-5 py-3 bg-gray-100 flex items-start gap-4">
      <Checkbox
        className="mt-2 w-6 h-6"
        disabled={false}
        checked={status == "done"}
        onClick={async () => {
          await toggleTaskStatus(id);
          if (status == "in progress") {
            props.onCheckBoxCLick();
          }
        }}
      />
      <div className="w-full">
        <Input
          value={localName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalName(e.target.value)}
          placeholder="Task name"
          className="font-semibold"
        />
        <Textarea
          value={localDescription}
          onChange={(e) => setLocalDescription(e.target.value)}
          placeholder="Task description"
          className="mt-1 text-sm text-gray-500"
        />
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
