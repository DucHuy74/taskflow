import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Show error state */
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles - Flat Design
          "flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm",
          "transition-all duration-150", // UX: Smooth transitions
          "placeholder:text-gray-400 dark:placeholder:text-gray-500",
          // Focus styles - Keyboard accessibility
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Border colors
          "border-gray-200 dark:border-gray-700",
          "hover:border-gray-300 dark:hover:border-gray-600",
          "focus:border-indigo-500 dark:focus:border-indigo-400",
          // Error state
          error ? "border-red-500 focus-visible:ring-red-500 dark:border-red-400" : "",
          // Dark mode background
          "dark:bg-gray-900 dark:text-gray-100",
          className
        )}
        ref={ref}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
