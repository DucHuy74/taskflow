import * as React from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

interface SkeletonProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn("rounded-md bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]", className)}
      animate={{
        backgroundPosition: ["200% 0", "-200% 0"],
      }}
      transition={{
        duration: 1.4,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "loop",
      }}
      style={{ backgroundSize: "200% 100%" }}
      {...(props as HTMLMotionProps<"div">)}
    />
  )
)
Skeleton.displayName = "Skeleton"

// Preset skeleton patterns for common use cases
const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn("p-4 space-y-3", className)}>
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <Skeleton className="h-20 w-full" />
  </div>
)

const SkeletonText = ({ lines = 3, className }: { lines?: number; className?: string }) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className="h-4"
        style={{ width: `${100 - (i * 15)}%` }}
      />
    ))}
  </div>
)

const SkeletonAvatar = ({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) => {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  }
  return (
    <Skeleton
      className={cn("rounded-full", sizes[size], className)}
    />
  )
}

const SkeletonButton = ({ className }: { className?: string }) => (
  <Skeleton className={cn("h-9 w-24 rounded-md", className)} />
)

const SkeletonBadge = ({ className }: { className?: string }) => (
  <Skeleton className={cn("h-5 w-16 rounded-full", className)} />
)

export { Skeleton, SkeletonCard, SkeletonText, SkeletonAvatar, SkeletonButton, SkeletonBadge }
