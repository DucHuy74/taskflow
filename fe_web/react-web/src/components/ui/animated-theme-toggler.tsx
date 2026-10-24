import { useCallback, useRef, type ComponentPropsWithoutRef } from 'react';
import { flushSync } from 'react-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface AnimatedThemeTogglerProps extends ComponentPropsWithoutRef<'button'> {
  duration?: number;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> };
};

/**
 * Theme switch that reveals the next theme as a circle growing from the button,
 * using the View Transitions API (adapted from Magic UI's AnimatedThemeToggler).
 * Falls back to an instant switch when the API is missing or motion is reduced.
 */
export function AnimatedThemeToggler({ className, duration = 450, ...props }: AnimatedThemeTogglerProps) {
  const { isDark, setTheme } = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggle = useCallback(async () => {
    const next = isDark ? 'light' : 'dark';
    const doc = document as ViewTransitionDocument;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!buttonRef.current || !doc.startViewTransition || reducedMotion) {
      setTheme(next);
      return;
    }

    const transition = doc.startViewTransition(() => {
      flushSync(() => setTheme(next));
    });
    try {
      await transition.ready;
    } catch {
      return; // Transition skipped (e.g. a newer toggle interrupted it); the theme is already applied.
    }

    const { top, left, width, height } = buttonRef.current.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
    );
  }, [duration, isDark, setTheme]);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => void toggle()}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={cn(
        'grid h-10 w-10 cursor-pointer place-items-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white',
        className,
      )}
      {...props}
    >
      {isDark ? <Sun aria-hidden="true" className="h-5 w-5" /> : <Moon aria-hidden="true" className="h-5 w-5" />}
    </button>
  );
}
