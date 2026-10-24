import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Mail, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToastMessage } from '@/components/ui/toast';
import { invitationService } from '@/services/invitationService';
import { notificationService } from '@/services/notificationService';
import { NOTIFICATIONS_QUERY_KEY, PENDING_INVITATIONS_QUERY_KEY } from '@/lib/queryKeys';
import type { Invitation, InvitationRole } from '@/types/invitation';

const ROLE_LABELS: Record<InvitationRole, string> = { ADMIN: 'Admin', MEMBER: 'Member', VIEWER: 'Viewer' };

function formatExpiry(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Lists GET /invitations/pending with Accept / Deny actions. Renders nothing when empty. */
export function PendingInvitations() {
  const queryClient = useQueryClient();
  const showToast = useToastMessage();
  const location = useLocation();
  const sectionRef = useRef<HTMLElement>(null);
  const highlightedId = new URLSearchParams(location.search).get('invitation');

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: PENDING_INVITATIONS_QUERY_KEY,
    queryFn: () => invitationService.getPendingInvitations(),
    refetchInterval: 60_000,
  });

  // Reuse the bell's cache so the related "you were invited" notification can be marked read on response.
  const { data: notifications = [] } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => notificationService.getUnread(),
    refetchInterval: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if ((location.hash === '#pending-invitations' || highlightedId) && invitations.length > 0) {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      sectionRef.current?.focus({ preventScroll: true });
    }
  }, [location.hash, highlightedId, invitations.length]);

  const respondMutation = useMutation({
    mutationFn: async ({ invitation, accept }: { invitation: Invitation; accept: boolean }) => {
      const ok = accept
        ? await invitationService.acceptInvitation(invitation.id)
        : await invitationService.denyInvitation(invitation.id);
      if (!ok) throw new Error('Invitation response failed');
      const related = notifications.find((notification) => notification.referenceId === invitation.id);
      if (related) await notificationService.markAsRead(related.id).catch(() => undefined);
      return accept;
    },
    onSuccess: (accepted) => {
      showToast(accepted ? 'You joined the workspace.' : 'Invitation declined.', 'success', 'Invitation');
      void queryClient.invalidateQueries({ queryKey: PENDING_INVITATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      if (accepted) void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
    onError: () => showToast('The invitation could not be updated. It may have expired.', 'error', 'Invitation'),
  });

  if (isLoading || invitations.length === 0) return null;

  return (
    <section
      id="pending-invitations"
      ref={sectionRef}
      tabIndex={-1}
      aria-labelledby="pending-invitations-heading"
      className="mb-8 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-indigo-900 dark:bg-indigo-950/40"
    >
      <h2 id="pending-invitations-heading" className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
        <Mail className="h-5 w-5 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
        Pending invitations
        <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">{invitations.length}</span>
      </h2>
      <ul className="space-y-2">
        {invitations.map((invitation) => {
          const workspaceLabel = invitation.workspaceName || 'a workspace';
          const description = `Join ${workspaceLabel} as ${ROLE_LABELS[invitation.role] ?? invitation.role}`;
          const isPending = respondMutation.isPending && respondMutation.variables?.invitation.id === invitation.id;
          return (
            <li
              key={invitation.id}
              className={cn(
                'flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between',
                highlightedId === invitation.id && 'ring-2 ring-indigo-500',
              )}
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  <span className="truncate">{invitation.workspaceName || 'Unnamed workspace'}</span>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200">
                    <span className="sr-only">Role: </span>{ROLE_LABELS[invitation.role] ?? invitation.role}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                  {invitation.inviterEmail ? <>Invited by <span className="break-all">{invitation.inviterEmail}</span></> : 'You were invited to join this workspace'}
                  {invitation.expiredAt && (
                    <> · Expires <time dateTime={invitation.expiredAt}>{formatExpiry(invitation.expiredAt)}</time></>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={isPending}
                  onClick={() => respondMutation.mutate({ invitation, accept: false })}
                  aria-label={`Deny invitation: ${description}`}
                >
                  <X className="h-4 w-4" aria-hidden="true" /> Deny
                </Button>
                <Button
                  className="min-h-11"
                  isLoading={isPending && respondMutation.variables?.accept}
                  disabled={isPending}
                  onClick={() => respondMutation.mutate({ invitation, accept: true })}
                  aria-label={`Accept invitation: ${description}`}
                >
                  <Check className="h-4 w-4" aria-hidden="true" /> Accept
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
