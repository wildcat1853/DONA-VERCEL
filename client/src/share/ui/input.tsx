import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          `flex w-full rounded-md border border-input bg-transparent border-transparent
          px-3 py-2 text-sm ring-offset-background placeholder:text-[#919191]
          focus-visible:outline-none focus-visible:ring-0 
          focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50`,
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
