import type { WorkspaceRole } from '@/types';

export const WORKSPACE_ROLES: WorkspaceRole[] = ['ADMIN', 'MEMBER', 'VIEWER'];

export const fieldClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-indigo-900';

export const labelClass = 'mb-1.5 block text-sm font-semibold text-gray-800 dark:text-gray-200';

export const panelClass = 'rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#161B22] sm:p-6';

export function roleLabel(role: string): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
