import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { ANIMATION_DURATION } from "@/lib/animations"

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | undefined>(undefined);

function useDropdownMenuContext() {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error("DropdownMenu components must be used within a DropdownMenu provider");
  }
  return context;
}

interface DropdownMenuProps {
  children: React.ReactNode;
}

const DropdownMenu = ({ children }: DropdownMenuProps) => {
  const [open, setOpen] = React.useState(false);

  // Close on click outside and ESC key
  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown-menu]')) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div data-dropdown-menu style={{ position: "relative", display: "inline-block" }}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
};

interface DropdownMenuTriggerProps extends React.HTMLAttributes<HTMLDivElement> {}

const DropdownMenuTrigger = React.forwardRef<HTMLDivElement, DropdownMenuTriggerProps>(
  ({ children, onClick, ...props }, ref) => {
    const { setOpen, open } = useDropdownMenuContext();
    return (
      <div
        ref={ref}
        onClick={(e) => {
          setOpen(!open);
          onClick?.(e);
        }}
        style={{ display: 'inline-block', cursor: 'pointer' }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

interface DropdownMenuContentProps {
  className?: string;
  children?: React.ReactNode;
}

const DropdownMenuContent = ({ className, children }: DropdownMenuContentProps) => {
  const { open } = useDropdownMenuContext();

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={cn(
          "absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-lg",
          "dark:bg-gray-900 dark:border-gray-800",
          className
        )}
        style={{ position: "absolute", top: "100%", right: 0 }}
        initial={{ opacity: 0, scale: 0.95, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -8 }}
        transition={{ duration: ANIMATION_DURATION.fast }}
        role="menu"
        aria-orientation="vertical"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
DropdownMenuContent.displayName = "DropdownMenuContent";

interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  destructive?: boolean;
}

const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className, children, destructive, onClick, ...props }, ref) => {
    const { setOpen } = useDropdownMenuContext();

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      setOpen(false);
      onClick?.(e);
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm",
          "transition-colors duration-150",
          "outline-none",
          destructive
            ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
          className
        )}
        onClick={handleClick}
        role="menuitem"
        tabIndex={0}
        {...props}
      >
        {children}
      </div>
    );
  }
);
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider",
        "dark:text-gray-400",
        className
      )}
      role="presentation"
      {...props}
    />
  )
);
DropdownMenuLabel.displayName = "DropdownMenuLabel";

const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-gray-100 dark:bg-gray-800", className)}
      role="separator"
      {...props}
    />
  )
);
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
}
