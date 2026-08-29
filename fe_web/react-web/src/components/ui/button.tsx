import * as React from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"
import { ANIMATION_DURATION, EASING } from "@/lib/animations"

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
  isLoading?: boolean
}

const buttonVariants = {
  default: "bg-blue-600 text-white hover:bg-blue-700",
  destructive: "bg-red-500 text-white hover:bg-red-600",
  outline: "border border-gray-200 bg-white hover:bg-gray-100",
  secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
  ghost: "hover:bg-gray-100",
  link: "text-blue-600 underline-offset-4 hover:underline",
}

const buttonSizes = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-8",
  icon: "h-9 w-9",
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild, isLoading, disabled, children, ...props }, ref) => {
    const isDisabled = disabled || isLoading
    const buttonClassName = cn(
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
      "disabled:pointer-events-none disabled:opacity-50",
      buttonVariants[variant],
      buttonSizes[size],
      className
    )

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        className: cn(buttonClassName, (children.props as { className?: string }).className),
        ...props,
      } as Partial<unknown>)
    }

    return (
      <motion.button
        className={buttonClassName}
        ref={ref}
        disabled={isDisabled}
        whileHover={isDisabled ? undefined : { scale: 1.02 }}
        whileTap={isDisabled ? undefined : { scale: 0.97 }}
        transition={{
          duration: ANIMATION_DURATION.fast,
          ease: EASING.easeOut,
        }}
        {...(props as HTMLMotionProps<"button">)}
      >
        {isLoading && (
          <motion.span
            className="flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </motion.span>
        )}
        {children}
      </motion.button>
    )
  }
)
Button.displayName = "Button"

export { Button }
