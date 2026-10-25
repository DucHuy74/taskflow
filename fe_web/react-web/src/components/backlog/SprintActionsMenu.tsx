import { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, MoreVertical, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SprintActionsMenuProps {
  sprintName: string;
  onEditSprint: () => void;
  /** When provided (InProgress sprints only), renders a "Complete sprint" item. */
  onCompleteSprint?: () => void;
  className?: string;
}

const itemClass = 'flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:bg-slate-800';

/** "⋮" actions menu for a sprint (menu-button pattern: Enter/Space/ArrowDown opens, arrows move, Escape closes). */
export function SprintActionsMenu({ sprintName, onEditSprint, onCompleteSprint, className }: SprintActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    const handlePointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    return () => document.removeEventListener('mousedown', handlePointer);
  }, [open]);

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Actions for ${sprintName}`}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="grid h-11 w-11 place-items-center rounded text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <MoreVertical className="h-5 w-5" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={`${sprintName} actions`}
          onKeyDown={(event) => {
            if (event.key === 'Escape' || event.key === 'Tab') {
              if (event.key === 'Escape') event.preventDefault();
              close(event.key === 'Escape');
              return;
            }
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
              event.preventDefault();
              const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
              const index = items.indexOf(document.activeElement as HTMLButtonElement);
              const next = event.key === 'Home' ? 0
                : event.key === 'End' ? items.length - 1
                : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
              items[next]?.focus();
            }
          }}
          className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900"
        >
          <button
            ref={firstItemRef}
            type="button"
            role="menuitem"
            onClick={() => {
              close(false);
              onEditSprint();
            }}
            className={itemClass}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit sprint
          </button>
          {onCompleteSprint && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close(false);
                onCompleteSprint();
              }}
              className={itemClass}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Complete sprint
            </button>
          )}
        </div>
      )}
    </div>
  );
}
