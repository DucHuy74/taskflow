import { clsx } from 'clsx';

export function Card({ children, className = '', onClick }) {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700',
        'shadow-sm hover:shadow-md transition-shadow',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={clsx('px-4 py-3 border-b border-gray-200 dark:border-gray-700', className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={clsx('px-4 py-4', className)}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={clsx('px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-lg', className)}>
      {children}
    </div>
  );
}
