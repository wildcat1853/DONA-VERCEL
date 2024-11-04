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
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Calendar as GoogleCalendarIcon } from 'lucide-react';

type Props = {
  name: string;
  description: string | null;
  id: string;
  assistantStatus: AssistantStatus;
  deadline: Date | null;
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

// Add this function to determine badge styling
function getDeadlineStyling(date: Date) {
  if (isToday(date)) {
    return "bg-red-100 text-red-700 hover:bg-red-200";  // Urgent styling
  }
  return "bg-[#F9D4E8] text-[#323232] hover:bg-[#F9D4E8]/80";  // Default styling
}

function TaskCard(props: Props) {
  const { description, name, id, status, deadline, assistantStatus, onUpdate, projectId, createdAt } = props;
  const [localName, setLocalName] = useState(name);
  const [localDescription, setLocalDescription] = useState(description || "");
  const [isLeaving, setIsLeaving] = useState(false);
  
  const [debouncedName] = useDebounce(localName, 1000);
  const [debouncedDescription] = useDebounce(localDescription, 1000);

  const [date, setDate] = useState<Date | null>(props.deadline || null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Auto-save when debounced values change
  useEffect(() => {
    if (debouncedName !== name || debouncedDescription !== description || date !== deadline) {
      const updatedTask = {
        id,
        name: debouncedName,
        description: debouncedDescription,
        status,
        deadline: date,
        projectId,
        createdAt
      };
      saveTask(updatedTask);
      onUpdate?.(updatedTask);
    }
  }, [debouncedName, debouncedDescription, date, name, description, deadline, id, status, projectId, createdAt, onUpdate]);

  const formattedDeadline = props.deadline ? formatDeadline(props.deadline) : null;

  const triggerConfetti = () => {
    confetti({
      particleCount: 200,
      spread: 500,
      origin: { y: 0.6 }
    });
  };

  const handleDateSelect = (newDate: Date | null) => {
    setDate(newDate);
    setIsCalendarOpen(false);
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
            <div className="flex gap-2 w-full flex-wrap">
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  {date ? (
                    <button className="cursor-pointer border-0 p-0 bg-transparent">
                      <Badge 
                        variant="outline" 
                        className={`flex items-center ${getDeadlineStyling(date)}`}
                      >
                        <AlarmCheck className="size-4 mr-1" />
                        {formatDeadline(date)}
                      </Badge>
                    </button>
                  ) : (
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      Set deadline
                    </Button>
                  )}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date ?? undefined}
                    onSelect={handleDateSelect}
                    required
                  />
                </PopoverContent>
              </Popover>

              {date && (
                <Button
                  onClick={async () => {
                    window.open(
                      await createEventURL({
                        title: name,
                        start: new Date(),
                        end: date,
                      })
                    );
                  }}
                  className="flex items-center gap-2"
                >
                  <GoogleCalendarIcon className="h-4 w-4" />
                  Add to calendar
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default TaskCard;
