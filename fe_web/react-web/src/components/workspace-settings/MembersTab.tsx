import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToastMessage } from '@/components/ui/toast';
import { workspaceService } from '@/services/workspaceService';
import { workspaceRoleService } from '@/services/workspaceRoleService';
import { ERROR_CODES, getApiErrorCode, getApiErrorMessage } from '@/services/apiError';
import { membersQueryKey, workspaceAccessQueryKey } from '@/lib/queryKeys';
import type { WorkspaceMemberResponse, WorkspaceRole } from '@/types';
import { WORKSPACE_ROLES, fieldClass, panelClass, roleLabel } from './shared';

interface MembersTabProps {
  workspaceId: string;
  canView: boolean;
  canManage: boolean;
  canInvite: boolean;
}

export function MembersTab({ workspaceId, canView, canManage, canInvite }: MembersTabProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToastMessage();

  const { data: members = [], isLoading } = useQuery({
    queryKey: membersQueryKey(workspaceId),
    queryFn: () => workspaceService.getWorkspaceMembers(workspaceId),
    enabled: canView,
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: WorkspaceRole }) =>
      workspaceRoleService.changeMemberRole(workspaceId, userId, role),
    onMutate: async ({ userId, role }) => {
      await queryClient.cancelQueries({ queryKey: membersQueryKey(workspaceId) });
      const previous = queryClient.getQueryData<WorkspaceMemberResponse[]>(membersQueryKey(workspaceId));
      queryClient.setQueryData<WorkspaceMemberResponse[]>(membersQueryKey(workspaceId), (current = []) =>
        current.map((member) => (member.userId === userId ? { ...member, role } : member)));
      return { previous };
    },
    onSuccess: (_data, { role }) => showToast(`Role changed to ${roleLabel(role)}.`, 'success', 'Member updated'),
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(membersQueryKey(workspaceId), context.previous);
      const message = getApiErrorCode(error) === ERROR_CODES.CANNOT_DEMOTE_LAST_ADMIN
        ? 'This is the last admin of the workspace. Promote another member to admin first.'
        : getApiErrorMessage(error, 'The role could not be changed.');
      showToast(message, 'error', 'Role change failed');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: membersQueryKey(workspaceId) });
      void queryClient.invalidateQueries({ queryKey: workspaceAccessQueryKey(workspaceId) });
    },
  });

  return (
    <section className={panelClass} aria-labelledby="members-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="members-heading" className="text-base font-semibold text-gray-900 dark:text-gray-100">Members</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {canManage ? 'Change a member’s role to update what they can do.' : 'You can view members but not change their roles.'}
          </p>
        </div>
        {canInvite && (
          <Button variant="outline" className="min-h-11" onClick={() => navigate(`/workspace/${workspaceId}/invite`)}>
            <UserPlus className="h-4 w-4" aria-hidden="true" /> Invite people
          </Button>
        )}
      </div>

      {!canView ? (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">You don’t have permission to view members of this workspace.</p>
      ) : isLoading ? (
        <div className="mt-4 space-y-2">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-12 w-full" />)}</div>
      ) : members.length === 0 ? (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">No members found.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Workspace members and their roles</caption>
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-600 dark:border-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="py-2 pr-4">Email</th>
                <th scope="col" className="w-48 py-2">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {members.map((member) => (
                <tr key={member.userId}>
                  <td className="break-all py-2 pr-4 text-gray-900 dark:text-gray-100">{member.email || member.userId}</td>
                  <td className="py-2">
                    <label htmlFor={`role-${member.userId}`} className="sr-only">Role for {member.email || member.userId}</label>
                    <select
                      id={`role-${member.userId}`}
                      value={member.role}
                      disabled={!canManage || (roleMutation.isPending && roleMutation.variables?.userId === member.userId)}
                      onChange={(event) => roleMutation.mutate({ userId: member.userId, role: event.target.value as WorkspaceRole })}
                      className={fieldClass}
                    >
                      {WORKSPACE_ROLES.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
