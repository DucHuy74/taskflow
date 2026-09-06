import * as React from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"
import { ANIMATION_DURATION, EASING } from "@/lib/animations"

interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  /** Enable hover lift effect - UX: Visual feedback on interactive cards */
  hoverLift?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverLift = false, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-sm",
        "dark:border-gray-800 dark:bg-gray-900",
        "transition-shadow duration-200", // UX: Smooth shadow transition
        className
      )}
      whileHover={hoverLift ? {
        y: -4,
        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        transition: { duration: ANIMATION_DURATION.fast, ease: EASING.easeOut },
      } : undefined}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIMATION_DURATION.normal, ease: EASING.easeOut }}
      {...(props as HTMLMotionProps<"div">)}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1.5 p-6",
        "text-gray-900 dark:text-gray-100",
        className
      )}
      {...props}
    />
  )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        "text-gray-900 dark:text-gray-100",
        className
      )}
      {...props}
    />
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        "text-sm text-gray-500 dark:text-gray-400",
        className
      )}
      {...props}
    />
  )
)
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("p-6 pt-0", className)}
      {...props}
    />
  )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
