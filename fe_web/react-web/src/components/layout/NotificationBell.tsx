import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Mail, UserCheck, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notificationService } from '@/services/notificationService';
import { useToastMessage } from '@/components/ui/toast';
import { NOTIFICATIONS_QUERY_KEY, PENDING_INVITATIONS_QUERY_KEY, formatRelativeTime } from '@/lib/queryKeys';
import type { NotificationResponse, NotificationType } from '@/types/notification';

const typeIcon: Record<NotificationType, typeof Bell> = {
  WORKSPACE_INVITE: Mail,
  INVITATION_ACCEPTED: UserCheck,
  INVITATION_DENIED: UserX,
};

const typeTone: Record<NotificationType, string> = {
  WORKSPACE_INVITE: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  INVITATION_ACCEPTED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  INVITATION_DENIED: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
};

export function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToastMessage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const headingId = useId();

  const { data: notifications = [], isLoading, isError } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => notificationService.getUnread(),
    refetchInterval: 30_000,
    retry: 1,
  });

  // Backend returns unread notifications only; filter defensively.
  const unread = notifications.filter((notification) => !notification.read);
  const unreadCount = unread.length;

  const markOneMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      const previous = queryClient.getQueryData<NotificationResponse[]>(NOTIFICATIONS_QUERY_KEY);
      queryClient.setQueryData<NotificationResponse[]>(NOTIFICATIONS_QUERY_KEY, (current = []) =>
        current.filter((notification) => notification.id !== id));
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, context.previous);
      showToast('The notification could not be marked as read.', 'error', 'Notifications');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      const previous = queryClient.getQueryData<NotificationResponse[]>(NOTIFICATIONS_QUERY_KEY);
      queryClient.setQueryData<NotificationResponse[]>(NOTIFICATIONS_QUERY_KEY, []);
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, context.previous);
      showToast('Notifications could not be marked as read.', 'error', 'Notifications');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });

  // Close on outside click / Escape (return focus to the trigger on Escape).
  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const handleSelect = (notification: NotificationResponse) => {
    markOneMutation.mutate(notification.id);
    if (notification.type === 'WORKSPACE_INVITE') {
      setOpen(false);
      const params = new URLSearchParams({ invitation: notification.referenceId });
      navigate(`/?${params.toString()}#pending-invitations`);
      void queryClient.invalidateQueries({ queryKey: PENDING_INVITATIONS_QUERY_KEY });
    }
  };

  const hasInvites = unread.some((notification) => notification.type === 'WORKSPACE_INVITE');

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        className="relative grid h-11 w-11 cursor-pointer place-items-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white dark:focus-visible:ring-offset-[#161B22]"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-white dark:ring-[#161B22]"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      <span className="sr-only" aria-live="polite" role="status">
        {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : ''}
      </span>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={headingId}
          className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-[#1C2128]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-2 dark:border-gray-700">
            <h2 id={headingId} className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </h2>
            <button
              type="button"
              onClick={() => markAllMutation.mutate()}
              disabled={unreadCount === 0 || markAllMutation.isPending}
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-indigo-300 dark:hover:bg-indigo-950"
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" /> Mark all as read
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <p className="px-4 py-6 text-center text-sm text-gray-600 dark:text-gray-300">Loading notifications…</p>
            ) : isError ? (
              <p className="px-4 py-6 text-center text-sm text-red-700 dark:text-red-300">Notifications could not be loaded.</p>
            ) : unread.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-600 dark:text-gray-300">You&apos;re all caught up.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700/70">
                {unread.map((notification) => {
                  const Icon = typeIcon[notification.type] ?? Bell;
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(notification)}
                        className="flex min-h-11 w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 dark:hover:bg-gray-800 dark:focus-visible:bg-gray-800"
                        aria-label={`${notification.title}. ${notification.content}. ${notification.type === 'WORKSPACE_INVITE' ? 'Open pending invitations' : 'Mark as read'}`}
                      >
                        <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full', typeTone[notification.type] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200')}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{notification.title}</span>
                          <span className="mt-0.5 block text-sm text-gray-700 dark:text-gray-300">{notification.content}</span>
                          <time dateTime={notification.createdAt} className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                            {formatRelativeTime(notification.createdAt)}
                          </time>
                        </span>
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-600 dark:bg-indigo-400" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {hasInvites && (
            <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate('/#pending-invitations');
                }}
                className="min-h-11 w-full cursor-pointer rounded-md text-sm font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:bg-indigo-950"
              >
                View pending invitations
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
