import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface SkeletonProps {
  className?: string
  /** Number of skeleton lines to show */
  lines?: number
  /** Show avatar skeleton */
  showAvatar?: boolean
  /** Show card skeleton */
  showCard?: boolean
}

/**
 * Skeleton loading component with pulse animation
 * UX: Provides visual feedback during loading states
 */
export function Skeleton({ className, lines = 3, showAvatar = false, showCard = false }: SkeletonProps) {
  if (showCard) {
    return (
      <div className={cn("rounded-xl border border-gray-200 bg-white p-4 space-y-4", className)}>
        <div className="flex items-center gap-3">
          <motion.div
            className="h-10 w-10 rounded-full bg-gray-200"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="flex-1 space-y-2">
            <motion.div
              className="h-4 w-1/3 rounded bg-gray-200"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="h-3 w-1/4 rounded bg-gray-100"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
            />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                "h-3 rounded bg-gray-100",
                i === lines - 1 ? "w-3/4" : "w-full"
              )}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.1,
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (showAvatar) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <motion.div
          className="h-10 w-10 rounded-full bg-gray-200"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="flex-1 space-y-2">
          <motion.div
            className="h-4 w-1/3 rounded bg-gray-200"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="h-3 w-1/4 rounded bg-gray-100"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
          />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className={cn("space-y-2", className)}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          className={cn(
            "h-4 rounded bg-gray-200",
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.1,
          }}
        />
      ))}
    </motion.div>
  )
}

/**
 * Text skeleton for inline loading
 */
export function SkeletonText({ className, width = "w-full" }: { className?: string; width?: string }) {
  return (
    <motion.div
      className={cn("h-4 rounded bg-gray-200", width, className)}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  )
}

/**
 * Avatar skeleton
 */
export function SkeletonAvatar({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  }

  return (
    <motion.div
      className={cn("rounded-full bg-gray-200", sizeClasses[size], className)}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  )
}

/**
 * Button skeleton
 */
export function SkeletonButton({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("h-10 w-24 rounded-lg bg-gray-200", className)}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  )
}
