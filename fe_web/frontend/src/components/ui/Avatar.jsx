import { clsx } from 'clsx';

const COLORS = [
  'bg-blue-500',
  'bg-red-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
];

function getColor(name) {
  return COLORS[name.charCodeAt(0) % COLORS.length];
}

function getInitials(name) {
  if (!name) return '?';
  const words = name.trim().split(' ');
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({ name, size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-12 h-12 text-lg',
  };

  return (
    <div
      className={clsx(
        'rounded flex items-center justify-center text-white font-medium',
        getColor(name || '?'),
        sizes[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
