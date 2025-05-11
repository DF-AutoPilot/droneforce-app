/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from "react"
import { cn } from "@/lib/utils"
import theme from "@/styles/theme"

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          "border-neutral-800 bg-neutral-900 text-white placeholder:text-neutral-500",
          "focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20",
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
