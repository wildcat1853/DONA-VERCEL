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
import confetti from 'canvas-confetti';

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
  const [isLeaving, setIsLeaving] = useState(false);
  
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

  const triggerConfetti = () => {
    confetti({
      particleCount: 200,
      spread: 500,
      origin: { y: 0.6 }
    });
  };

  return (
    <Card 
      className={`px-5 py-3 bg-gray-100 flex items-start gap-4 transition-all duration-500 ${
        isLeaving ? 'opacity-0 transform translate-x-full' : 'opacity-100'
      }`}
    >
      <Checkbox
        className="mt-2 w-6 h-6 hover:border-blue-500 transition-colors"
        checked={status == "done"}
        onClick={async () => {
          if (status == "in progress") {
            triggerConfetti();
            setIsLeaving(true);
            setTimeout(async () => {
              await toggleTaskStatus(id);
              props.onCheckBoxCLick();
            }, 500);
          }
        }}
      />
      <div className="w-full">
        <Input
          value={localName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalName(e.target.value)}
          placeholder="Task name"
          className="font-semibold text-lg focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-transparent border-none shadow-none bg-transparent"
        />
        <Input
          value={localDescription}
          onChange={(e) => setLocalDescription(e.target.value)}
          placeholder="Task description"
          className="mt-1 text-sm text-gray-500 focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-transparent border-none shadow-none bg-transparent"
        />
        <div className="w-full flex items-center justify-between mt-6">
          {status == "in progress" && (
            <>
              <Badge className="bg-[#F9D4E8] text-[#323232]">
                <AlarmCheck className="size-4 mr-1" />
                {formattedDeadline}
              </Badge>
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
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

export default TaskCard;
