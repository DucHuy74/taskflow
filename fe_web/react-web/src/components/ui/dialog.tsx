import * as React from "react"
import { motion, AnimatePresence, type HTMLMotionProps } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ANIMATION_DURATION, EASING } from "@/lib/animations"

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | undefined>(undefined);

function useDialogContext() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog components must be used within a Dialog provider");
  }
  return context;
}

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog = ({ open: controlledOpen, onOpenChange, children }: DialogProps) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;

  // Handle ESC key for accessibility
  React.useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange?.(false);
        setInternalOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    // Prevent body scroll when dialog is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onOpenChange]);

  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    setInternalOpen(newOpen);
    onOpenChange?.(newOpen);
  }, [onOpenChange]);

  return (
    <DialogContext.Provider value={{ open, setOpen: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

interface DialogTriggerProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'> {}

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ children, onClick, ...props }, ref) => {
    const { setOpen } = useDialogContext();
    return (
      <motion.button
        ref={ref}
        type="button"
        whileTap={{ scale: 0.97 }}
        transition={{ duration: ANIMATION_DURATION.fast }}
        onClick={(e) => {
          setOpen(true);
          onClick?.(e);
        }}
        {...(props as HTMLMotionProps<"button">)}
      >
        {children}
      </motion.button>
    );
  }
);
DialogTrigger.displayName = "DialogTrigger";

interface DialogContentProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'> {}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useDialogContext();

    return (
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: ANIMATION_DURATION.fast }}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            {/* Dialog */}
            <motion.div
              ref={ref}
              className={cn(
                "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-6 shadow-xl",
                "w-full max-w-lg max-h-[90vh] overflow-y-auto",
                "dark:bg-gray-900 dark:border-gray-800",
                className
              )}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{
                duration: ANIMATION_DURATION.normal,
                ease: EASING.easeOut,
              }}
              role="dialog"
              aria-modal="true"
              {...(props as HTMLMotionProps<"div">)}
            >
              {/* Close button - UX: Always accessible */}
              <button
                type="button"
                className="absolute right-4 top-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer dark:hover:text-gray-300 dark:hover:bg-gray-800"
                onClick={() => setOpen(false)}
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }
);
DialogContent.displayName = "DialogContent";

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 pr-8", className)}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIMATION_DURATION.normal, delay: 0.05 }}
      {...(props as HTMLMotionProps<"div">)}
    />
  )
);
DialogHeader.displayName = "DialogHeader";

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIMATION_DURATION.normal, delay: 0.1 }}
      {...(props as HTMLMotionProps<"div">)}
    />
  )
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn("text-lg font-semibold text-gray-900 dark:text-gray-100", className)}
      {...props}
    />
  )
);
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-gray-500 dark:text-gray-400", className)}
      {...props}
    />
  )
);
DialogDescription.displayName = "DialogDescription";

interface DialogCloseProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'> {}

const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(
  ({ ...props }, ref) => {
    const { setOpen } = useDialogContext();
    return (
      <motion.button
        ref={ref}
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: ANIMATION_DURATION.fast }}
        onClick={() => setOpen(false)}
        className="cursor-pointer"
        {...(props as HTMLMotionProps<"button">)}
      />
    );
  }
);
DialogClose.displayName = "DialogClose";

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
}
