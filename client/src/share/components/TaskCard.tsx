// TaskCard.tsx

"use client";
import React, { useState, useEffect, useRef } from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import { AlarmCheck, Calendar as GoogleCalendarIcon } from "lucide-react";
import { toggleTaskStatus } from "@/app/actions/task";
import { AssistantStatus } from "ai";
import { createEventURL } from "@/app/actions/calendar";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { useDebounce } from "use-debounce";
import { saveTask } from "@/app/actions/task";
import { Task } from "../../../../define";
import { Input } from "../ui/input";
import confetti from "canvas-confetti";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { DateTimePicker } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { DateTime } from "luxon";
import { Popper, Paper } from "@mui/material";
import { StaticDateTimePicker } from "@mui/x-date-pickers/StaticDateTimePicker";
import { createOrUpdateTask } from "@/app/actions/task";
import { useSession } from "next-auth/react";

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
  | { status: "in progress"; onCheckBoxClick: () => void }
);

function formatDeadline(date: Date): string {
  if (isToday(date)) {
    return `Today at ${format(date, "h:mm a")}`;
  } else if (isTomorrow(date)) {
    return `Tomorrow at ${format(date, "h:mm a")}`;
  } else if (isYesterday(date)) {
    return `Yesterday at ${format(date, "h:mm a")}`;
  } else {
    return format(date, "MMM d, h:mm a");
  }
}

function getDeadlineStyling(date: Date) {
  if (isToday(date)) {
    return "bg-red-100 text-red-700 hover:bg-red-200";
  }
  return "bg-[#F9D4E8] text-[#323232] hover:bg-[#F9D4E8]/80";
}

function TaskCard(props: Props) {
  const {
    description,
    name,
    id,
    status,
    deadline,
    assistantStatus,
    onUpdate,
    projectId,
    createdAt,
  } = props;
  const [localName, setLocalName] = useState(name);
  const [localDescription, setLocalDescription] = useState(description || "");
  const [isLeaving, setIsLeaving] = useState(false);

  const [debouncedName] = useDebounce(localName, 1000);
  const [debouncedDescription] = useDebounce(localDescription, 1000);

  const [date, setDate] = useState<Date | null>(props.deadline || null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [tempDate, setTempDate] = useState<DateTime | null>(null);

  const saveTimeout = useRef<NodeJS.Timeout>();

  const { data: session } = useSession();

  // console.log('TaskCard props:', props); // Debug log
  // console.log('ProjectId in TaskCard:', projectId); // Debug log

  useEffect(() => {
    if (
      debouncedName !== name ||
      debouncedDescription !== description ||
      date !== deadline
    ) {
      const updatedTask = {
        id,
        name: debouncedName,
        description: debouncedDescription,
        status,
        deadline: date,
        projectId,
        createdAt,
      };
      saveTask(updatedTask);
      onUpdate?.(updatedTask);
    }
  }, [
    debouncedName,
    debouncedDescription,
    date,
    name,
    description,
    deadline,
    id,
    status,
    projectId,
    createdAt,
    onUpdate,
  ]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 200,
      spread: 500,
      origin: { y: 0.6 },
    });
  };

  const handleDateSelect = (newDate: DateTime | null) => {
    setTempDate(newDate);
  };

  const handleAccept = async () => {
    if (tempDate) {
      setDate(tempDate.toJSDate());
      setTempDate(null);
      
      // Create calendar event when deadline is set
      try {
        const response = await fetch('/api/create-calendar-event', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskName: localName,
            description: localDescription,
            deadline: tempDate.toJSDate(),
          }),
        });

        if (!response.ok) {
          console.error('Failed to create calendar event');
        }
      } catch (error) {
        console.error('Error creating calendar event:', error);
      }
    }
    setIsPickerOpen(false);
  };

  const handleButtonClick = (event: React.MouseEvent<HTMLElement>) => {
    setIsPickerOpen(true);
    setAnchorEl(event.currentTarget);
  };

  const handleOpenPicker = () => {
    if (!date) {
      setDate(new Date());
    }
    setIsPickerOpen(true);
  };

  const handleNameChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newName = event.target.value;
    setLocalName(newName);
    
    console.log('About to save task with projectId:', projectId); // Debug log
    
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      if (newName.trim()) {
        const taskData = {
          id: id,
          name: newName,
          projectId: projectId,
          status: status,
          description: localDescription,
          deadline: date,
          createdAt: createdAt
        };
        console.log('Saving task with data:', taskData); // Debug log
        createOrUpdateTask(taskData);
      }
    }, 500);
  };

  return (
    <Card
      className={`px-5 py-3 bg-gray-100 flex items-start gap-4 transition-all duration-500 ${
        isLeaving ? "opacity-0 transform translate-x-full" : "opacity-100"
      }`}
    >
      <Checkbox
        className="mt-2 w-6 h-6 hover:border-blue-500 transition-colors"
        checked={status === "done"}
        onClick={async () => {
          if (status === "in progress") {
            triggerConfetti();
            setIsLeaving(true);
            setTimeout(async () => {
              await toggleTaskStatus(id);
              props.onCheckBoxClick();
            }, 500);
          }
        }}
      />
      <div className="w-full">
        <Input
          value={localName}
          onChange={handleNameChange}
          placeholder="Task name"
          className="font-semibold text-xl focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-transparent border-none shadow-none bg-transparent"
        />
        <Input
          value={localDescription}
          onChange={(e) => setLocalDescription(e.target.value)}
          placeholder="Task description"
          className="mt-1 text-sm text-gray-500 focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-transparent border-none shadow-none bg-transparent"
        />
        <div className="w-full flex items-center justify-between mt-6">
          {status === "in progress" && (
            <div className="flex gap-2 w-full flex-wrap">
              <LocalizationProvider dateAdapter={AdapterLuxon}>
                {date ? (
                  <div>
                    <button
                      className="cursor-pointer border-0 p-0 bg-transparent"
                      onClick={handleButtonClick}
                    >
                      <Badge
                        variant="outline"
                        className={`flex items-center ${getDeadlineStyling(
                          date
                        )}`}
                      >
                        <AlarmCheck className="size-4 mr-1" />
                        {formatDeadline(date)}
                      </Badge>
                    </button>
                    <Popper
                      open={isPickerOpen}
                      anchorEl={anchorEl}
                      placement="bottom-start"
                      style={{ zIndex: 9999 }}
                    >
                      <Paper
                        elevation={3}
                        sx={{
                          borderRadius: 2,
                          bgcolor: 'background.paper',
                          '& .MuiStaticDateTimePicker-root': {
                            borderRadius: 2,
                          }
                        }}
                      >
                        <StaticDateTimePicker
                          defaultValue={DateTime.now()}
                          value={tempDate || (date ? DateTime.fromJSDate(date) : DateTime.now())}
                          onChange={handleDateSelect}
                          onAccept={handleAccept}
                          onClose={() => setIsPickerOpen(false)}
                          slotProps={{
                            actionBar: {
                              actions: ['cancel', 'accept']
                            },
                            toolbar: {
                              hidden: false
                            }
                          }}
                        />
                      </Paper>
                    </Popper>
                  </div>
                ) : (
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={handleButtonClick}
                    >
                      <AlarmCheck className="h-4 w-4 mr-2" />
                      Set deadline
                    </Button>
                    <Popper
                      open={isPickerOpen}
                      anchorEl={anchorEl}
                      placement="bottom-start"
                      style={{ zIndex: 9999 }}
                    >
                      <Paper
                        elevation={3}
                        sx={{
                          borderRadius: 2,
                          bgcolor: 'background.paper',
                          '& .MuiStaticDateTimePicker-root': {
                            borderRadius: 2,
                          }
                        }}
                      >
                        <StaticDateTimePicker
                          defaultValue={DateTime.now()}
                          value={tempDate}
                          onChange={handleDateSelect}
                          onAccept={handleAccept}
                          onClose={() => setIsPickerOpen(false)}
                          slotProps={{
                            actionBar: {
                              actions: ['cancel', 'accept']
                            },
                            toolbar: {
                              hidden: false
                            }
                          }}
                        />
                      </Paper>
                    </Popper>
                  </div>
                )}
              </LocalizationProvider>

              {date && (
                <Button
                  onClick={async () => {
                    // Create an end time 15 minutes after the start time
                    const endTime = new Date(date.getTime());
                    endTime.setMinutes(endTime.getMinutes() + 15);

                    window.open(
                      await createEventURL({
                        title: `Sync with Dona: ${name}`,
                        description: description || '',
                        start: date,
                        end: endTime, // 15 minutes after start time
                        location: '',
                      })
                    );
                  }}
                  className="hidden md:flex items-center gap-2"
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