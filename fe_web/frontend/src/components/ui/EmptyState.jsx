import { clsx } from 'clsx';

export function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-12 text-center', className)}>
      {Icon && (
        <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
