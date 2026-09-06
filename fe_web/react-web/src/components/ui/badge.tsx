import * as React from "react"
import { cn } from "@/lib/utils"

const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-indigo-600 text-white",
    secondary: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    destructive: "bg-red-600 text-white",
    success: "bg-emerald-600 text-white",
    warning: "bg-amber-500 text-white",
    outline: "border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300",
  }
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  )
})
Badge.displayName = "Badge"

export { Badge }
