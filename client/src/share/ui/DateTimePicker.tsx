// DateTimePicker.tsx

"use client";

import * as React from "react";
import { Calendar } from "./calendar";
import { Button } from "./button";
import { ScrollArea } from "./scroll-area";

interface DateTimePickerProps {
  date?: Date | null;
  onDateChange?: (date: Date | null) => void;
}

export function DateTimePicker({ date, onDateChange }: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(date || null);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const ampm = ["AM", "PM"];

  const handleDateSelect = (newDate: Date | null) => {
    setSelectedDate(newDate);
    onDateChange?.(newDate);
  };

  const handleTimeChange = (type: "hour" | "minute" | "ampm", value: string) => {
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      if (type === "hour") {
        const currentMinutes = newDate.getMinutes();
        const currentHours = newDate.getHours();
        const isPM = currentHours >= 12;
        const newHour = parseInt(value);
        newDate.setHours(isPM ? newHour % 12 + 12 : newHour % 12, currentMinutes);
      } else if (type === "minute") {
        newDate.setMinutes(parseInt(value));
      } else if (type === "ampm") {
        const currentHours = newDate.getHours();
        if (value === "PM" && currentHours < 12) {
          newDate.setHours(currentHours + 12);
        } else if (value === "AM" && currentHours >= 12) {
          newDate.setHours(currentHours - 12);
        }
      }
      handleDateSelect(newDate);
    }
  };

  const selectedHour = selectedDate ? ((selectedDate.getHours() % 12) || 12) : 12;
  const selectedMinute = selectedDate ? selectedDate.getMinutes() : 0;
  const selectedAmPm = selectedDate ? (selectedDate.getHours() >= 12 ? "PM" : "AM") : "AM";

  return (
    <div className="flex flex-col gap-4">
      <Calendar
        mode="single"
        selected={selectedDate || undefined}
        onSelect={(date: Date | undefined) => handleDateSelect(date ?? null)}
        showOutsideDays={true}
        required={false}
      />
      <div className="flex items-center justify-center gap-2">
        {/* Hours */}
        <ScrollArea className="h-40 w-16 overflow-y-auto">
          {hours.map((hour) => (
            <Button
              key={hour}
              variant={selectedHour === hour ? "default" : "ghost"}
              onClick={() => handleTimeChange("hour", hour.toString())}
              className="w-full"
            >
              {hour}
            </Button>
          ))}
        </ScrollArea>
        <span className="text-xl">:</span>
        {/* Minutes */}
        <ScrollArea className="h-40 w-16 overflow-y-auto">
          {minutes.map((minute) => (
            <Button
              key={minute}
              variant={selectedMinute === minute ? "default" : "ghost"}
              onClick={() => handleTimeChange("minute", minute.toString())}
              className="w-full"
            >
              {minute.toString().padStart(2, "0")}
            </Button>
          ))}
        </ScrollArea>
        {/* AM/PM */}
        <ScrollArea className="h-40 w-16 overflow-y-auto">
          {ampm.map((period) => (
            <Button
              key={period}
              variant={selectedAmPm === period ? "default" : "ghost"}
              onClick={() => handleTimeChange("ampm", period)}
              className="w-full"
            >
              {period}
            </Button>
          ))}
        </ScrollArea>
      </div>
    </div>
  );
}