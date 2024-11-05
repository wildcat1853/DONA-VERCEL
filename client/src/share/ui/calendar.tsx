// // calendar.tsx

// "use client"

// import * as React from "react"
// import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons"
// import { DayPicker } from "react-day-picker"

// import { cn } from "@/lib/utils"
// import { buttonVariants } from "./button"

// export type CalendarProps = React.ComponentProps<typeof DayPicker>

// function Calendar({
//   className,
//   classNames,
//   showOutsideDays = true,
//   ...props
// }: CalendarProps) {
//   return (
//     <DayPicker
//       showOutsideDays={showOutsideDays}
//       className={cn("p-3", className)}
//       classNames={{
//         months: "",
//         month: "",
//         caption: "flex justify-center pt-1 relative items-center",
//         caption_label: "text-sm font-medium",
//         nav: "flex items-center space-x-1",
//         nav_button: cn(
//           buttonVariants({ variant: "outline" }),
//           "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
//         ),
//         nav_button_previous: "absolute left-1",
//         nav_button_next: "absolute right-1",
//         table: "w-full border-collapse table-fixed",
//         head_row: "",
//         head_cell:
//           "w-1/7 text-muted-foreground font-normal text-[0.8rem] text-center",
//         row: "",
//         cell: cn(
//           "w-1/7 p-0 text-center text-sm relative",
//           "[&:has([aria-selected])]:bg-accent",
//           "[&:has([aria-selected].day-outside)]:bg-accent/50",
//           "[&:has([aria-selected])]:rounded-md"
//         ),
//         day: cn(
//           buttonVariants({ variant: "ghost" }),
//           "h-8 w-8 p-0 font-normal aria-selected:opacity-100"
//         ),
//         // ... include any other classNames as needed
//         ...classNames,
//       }}
//       components={{
//         IconLeft: ({ ...props }) => (
//           <ChevronLeftIcon className="h-4 w-4" />
//         ),
//         IconRight: ({ ...props }) => (
//           <ChevronRightIcon className="h-4 w-4" />
//         ),
//       }}
//       {...props}
//     />
//   )
// }
// Calendar.displayName = "Calendar"

// export { Calendar }