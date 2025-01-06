"use client";
import React, { useState, useEffect, useRef } from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import { AlarmCheck, Calendar as GoogleCalendarIcon } from "lucide-react";
import { toggleTaskStatus } from "@/app/actions/task";
import { createEventURL } from "@/app/actions/calendar";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { saveTask, createOrUpdateTask } from "@/app/actions/task";
import { Task } from "@/define/define";
import { Input } from "../ui/input";
import confetti from "canvas-confetti";

import { useDebounce } from "use-debounce";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { scheduleTaskEmails } from '@/lib/emailScheduler';

// MUI date/time
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { DesktopDatePicker } from "@mui/x-date-pickers/DesktopDatePicker";
import { TimeField } from "@mui/x-date-pickers/TimeField";
import { DateTime } from "luxon";

type Props = {
  name: string;
  description: string | null;
  id: string;
  deadline: Date | null;
  createdAt: Date;
  projectId: string;
  assistantStatus: any; // or your type
} & (
  | { status: "done" }
  | { status: "in progress"; onCheckBoxClick: () => void }
) & {
  onUpdate?: (task: Task) => void; // from parent
};

/** Format how the deadline displays on the card badge */
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

/** Applies special styling if the date is 'today' */
function getDeadlineStyling(date: Date) {
  if (isToday(date)) {
    return "bg-red-100 text-red-700 hover:bg-red-200";
  }
  return "bg-[#F9D4E8] text-[#323232] hover:bg-[#F9D4E8]/80";
}

function TaskCard(props: Props) {
  const {
    name,
    description,
    id,
    deadline,
    status,
    createdAt,
    projectId,
    onUpdate,
  } = props;

  // Basic local states for name/desc
  const [localName, setLocalName] = useState(name);
  const [localDescription, setLocalDescription] = useState(description || "");
  const [isLeaving, setIsLeaving] = useState(false);

  // Debouncing for auto-save
  const [debouncedName] = useDebounce(localName, 1000);
  const [debouncedDescription] = useDebounce(localDescription, 1000);

  // The final date shown on the card
  const [date, setDate] = useState<Date | null>(deadline);

  // A toggle for the "Set deadline" dialog
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);

  // MUI pickers: separate date/time so changes show immediately
  const [selectedDate, setSelectedDate] = useState<DateTime | null>(
    deadline ? DateTime.fromJSDate(deadline) : null
  );
  const [selectedTime, setSelectedTime] = useState<DateTime | null>(
    deadline 
      ? DateTime.fromJSDate(deadline) 
      : DateTime.local().set({ hour: 17, minute: 0 }) // Set 5:00 PM as default
  );

  const saveTimeout = useRef<NodeJS.Timeout>();
  const { data: session } = useSession();

  // Restore the critical useEffect for updates
  useEffect(() => {
    // If they've changed from original, let's push an update
    if (
      debouncedName !== name ||
      debouncedDescription !== description ||
      date !== deadline
    ) {
      const updatedTask: Task = {
        id,
        name: debouncedName,
        description: debouncedDescription,
        status,
        deadline: date,
        projectId,
        createdAt,
      };

      // Save to your server or DB
      saveTask(updatedTask);

      // Let parent know so it merges into its state
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

  // Confetti if user checks the box
  const triggerConfetti = () => {
    confetti({
      particleCount: 200,
      spread: 500,
      origin: { y: 0.6 },
    });
  };

  // Merge date & time on "Save"
  const handleSaveDateTime = async () => {
    console.log('🎯 handleSaveDateTime triggered');
    
    if (!selectedDate) {
        console.log('❌ No selected date');
        return;
    }

    const finalDate = selectedDate
        .set({
            hour: selectedTime?.hour || 0,
            minute: selectedTime?.minute || 0,
        })
        .toJSDate();

    console.log('🕒 Final date:', finalDate);
    console.log('👤 Session state:', {
        exists: !!session,
        email: session?.user?.email,
        accessToken: !!session?.accessToken
    });

    setDate(finalDate);
    setIsEditingDeadline(false);

    // Create updated task object
    const updatedTask: Task = {
        id,
        name: localName,
        description: localDescription,
        status,
        deadline: finalDate,
        projectId,
        createdAt,
    };

    try {
        // Save task first
        await saveTask(updatedTask);
        console.log('💾 Task saved successfully');

        // Create calendar event
        if (session?.user?.email) {
            try {
                console.log('🗓️ Starting calendar event creation...');
                const response = await fetch('/api/create-calendar-event', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        taskName: localName,
                        description: localDescription,
                        deadline: finalDate,
                        projectId
                    }),
                });

                console.log('📥 Raw response:', response);
                const result = await response.json();
                console.log('📬 Calendar event creation result:', result);

                if (!response.ok) {
                    console.error('❌ Failed to create calendar event:', {
                        status: response.status,
                        statusText: response.statusText,
                        result
                    });
                }
            } catch (error: any) {
                console.error('🚨 Error creating calendar event:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
            }
        } else {
            console.log('⚠️ No user session found for calendar event:', {
                hasSession: !!session,
                hasUser: !!session?.user,
                hasEmail: !!session?.user?.email
            });
        }

        // Notify parent
        onUpdate?.(updatedTask);
        console.log('✅ Parent notified of update');

    } catch (error) {
        console.error('🚨 Error in handleSaveDateTime:', error);
    }
  };

  // Name input changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setLocalName(newName);

    // Slight throttle
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      if (newName.trim()) {
        const taskData = {
          id,
          name: newName,
          projectId,
          status,
          description: localDescription,
          deadline: date,
          createdAt,
        };
        createOrUpdateTask(taskData);
      }
    }, 500);
  };

  // When clicking "Set deadline", initialize both date and time
  const handleStartDeadlineEdit = () => {
    if (!selectedDate) {
      setSelectedDate(DateTime.local()); // Today's date
    }
    if (!selectedTime) {
      setSelectedTime(DateTime.local().set({ hour: 17, minute: 0 })); // 5:00 PM
    }
    setIsEditingDeadline(true);
  };

  const handleDeadlineChange = async (newDeadline: Date) => {
    if (newDeadline && session?.user?.email) {
      try {
        // Create Google Calendar event
        const endTime = new Date(newDeadline.getTime() + 15 * 60000); // 15 minutes duration
        const eventURL = await createEventURL({
          title: `Task Deadline: ${name}`,
          description: description || "",
          start: newDeadline,
          end: endTime,
          location: "",
        });

        // Schedule emails
        await scheduleTaskEmails(
          { ...props, deadline: newDeadline },
          session.user.email,
          eventURL
        );

        // Update task
        if (props.onUpdate) {
          props.onUpdate({
            ...props,
            deadline: newDeadline,
          });
        }
      } catch (error) {
        console.error('Error handling deadline change:', error);
      }
    }
  };

  return (
    <>
      {/* The card UI */}
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
                if ("onCheckBoxClick" in props) {
                  props.onCheckBoxClick();
                }
              }, 500);
            }
          }}
        />
        <div className="w-full">
          <Input
            value={localName}
            onChange={handleNameChange}
            placeholder="Task name"
            className="font-semibold text-xl bg-transparent border-none shadow-none focus:outline-none focus:ring-0"
          />
          <Input
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            placeholder="Task description"
            className="mt-1 text-sm text-gray-500 bg-transparent border-none shadow-none focus:outline-none focus:ring-0"
          />

          {/* If status === "in progress", show the deadline UI */}
          {status === "in progress" && (
            <div className="flex items-center justify-between mt-6">
              <LocalizationProvider dateAdapter={AdapterLuxon}>
                {isEditingDeadline ? (
                  <div className="flex items-center gap-2">
                    <DesktopDatePicker
                      value={selectedDate}
                      onChange={(newVal) => {
                        if (newVal && newVal.isValid) {
                          setSelectedDate(newVal);
                        }
                      }}
                      slotProps={{
                        textField: {
                          size: "small",
                          sx: { width: '150px' }
                        },
                      }}
                    />
                    <TimeField
                      value={selectedTime}
                      onChange={(newVal) => {
                        if (newVal && newVal.isValid) {
                          setSelectedTime(newVal);
                        }
                      }}
                      format="hh:mm a"
                      slotProps={{
                        textField: {
                          size: "small",
                          sx: { width: '100px' }
                        },
                      }}
                    />
                    <Button 
                      size="sm"
                      className="bg-blue-500 text-white hover:bg-blue-600"
                      onClick={() => {
                        console.log('🔘 Save button clicked');
                        handleSaveDateTime();
                      }}
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  date ? (
                    <button
                      className="bg-transparent border-0 p-0 cursor-pointer"
                      onClick={() => setIsEditingDeadline(true)}
                    >
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
                      size="sm"
                      className="rounded-full"
                      onClick={handleStartDeadlineEdit}
                    >
                      <AlarmCheck className="h-4 w-4 mr-2" />
                      Set deadline
                    </Button>
                  )
                )}

                {date && (
                  <Button
                    onClick={async () => {
                      const endTime = new Date(date.getTime());
                      endTime.setMinutes(endTime.getMinutes() + 15);

                      window.open(
                        await createEventURL({
                          title: `Sync with Dona: ${name}`,
                          description: localDescription || "",
                          start: date,
                          end: endTime,
                          location: "",
                        })
                      );
                    }}
                    className="hidden md:flex items-center gap-2 ml-3"
                  >
                    <GoogleCalendarIcon className="h-4 w-4" />
                    Add to calendar
                  </Button>
                )}
              </LocalizationProvider>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

export default TaskCard;