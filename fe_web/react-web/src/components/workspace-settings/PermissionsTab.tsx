import { Fragment, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToastMessage } from '@/components/ui/toast';
import { workspaceRoleService } from '@/services/workspaceRoleService';
import { getApiErrorMessage } from '@/services/apiError';
import { PERMISSION_CATEGORIES, formatPermission, type Permission, type RolePermissionMatrixResponse } from '@/types/acl';
import type { WorkspaceRole } from '@/types';
import { WORKSPACE_ROLES, panelClass, roleLabel } from './shared';

interface PermissionsTabProps {
  workspaceId: string;
  canEdit: boolean;
}

type Draft = Record<string, Set<Permission>>;

const matrixKey = (workspaceId: string) => ['permission-matrix', workspaceId] as const;

function toDraft(matrix: RolePermissionMatrixResponse[]): Draft {
  return Object.fromEntries(matrix.map((row) => [row.role, new Set(row.permissions)]));
}

function sameSet(a: Set<Permission> | undefined, b: Permission[] | undefined): boolean {
  const other = new Set(b ?? []);
  if (!a) return other.size === 0;
  return a.size === other.size && [...a].every((item) => other.has(item));
}

/** ADMIN always keeps WORKSPACE_ADMINISTER (enforced by the backend). */
const isLocked = (role: string, permission: Permission) => role === 'ADMIN' && permission === 'WORKSPACE_ADMINISTER';

export function PermissionsTab({ workspaceId, canEdit }: PermissionsTabProps) {
  const queryClient = useQueryClient();
  const showToast = useToastMessage();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: matrixKey(workspaceId),
    queryFn: () => workspaceRoleService.getPermissionMatrix(workspaceId),
  });

  const matrix = useMemo(() => data ?? [], [data]);
  // Unsaved per-role edits layered over the server matrix.
  const [overrides, setOverrides] = useState<Draft>({});
  const draft = useMemo<Draft>(() => ({ ...toDraft(matrix), ...overrides }), [matrix, overrides]);

  const roles = useMemo(() => {
    const present = matrix.map((row) => row.role);
    return [...WORKSPACE_ROLES.filter((role) => present.includes(role)), ...present.filter((role) => !WORKSPACE_ROLES.includes(role))];
  }, [matrix]);

  const saveMutation = useMutation({
    mutationFn: (role: WorkspaceRole) => workspaceRoleService.updateRolePermissions(workspaceId, role, [...(draft[role] ?? [])]),
    onSuccess: (updated) => {
      queryClient.setQueryData<RolePermissionMatrixResponse[]>(matrixKey(workspaceId), (current = []) =>
        current.map((row) => (row.role === updated.role ? updated : row)));
      setOverrides((current) => {
        const next = { ...current };
        delete next[updated.role];
        return next;
      });
      void queryClient.invalidateQueries({ queryKey: ['workspace-access', workspaceId] });
      showToast(`${roleLabel(updated.role)} permissions saved.`, 'success', 'Permissions updated');
    },
    onError: (error) => showToast(getApiErrorMessage(error, 'Permissions could not be saved.'), 'error', 'Save failed'),
  });

  const toggle = (role: string, permission: Permission) => {
    const next = new Set(draft[role] ?? []);
    if (next.has(permission)) next.delete(permission);
    else next.add(permission);
    setOverrides((current) => ({ ...current, [role]: next }));
  };

  if (isLoading) {
    return <div className={panelClass}><Skeleton className="h-64 w-full" /></div>;
  }
  if (isError) {
    return (
      <div className={panelClass} role="alert">
        <p className="text-sm text-red-700 dark:text-red-300">The permission matrix could not be loaded.</p>
        <Button variant="outline" className="mt-3 min-h-11" onClick={() => void refetch()}>Try again</Button>
      </div>
    );
  }

  return (
    <section className={panelClass} aria-labelledby="permissions-heading">
      <h2 id="permissions-heading" className="text-base font-semibold text-gray-900 dark:text-gray-100">Role permissions</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {canEdit
          ? 'Tick the actions each role may perform, then save that role.'
          : 'Read only: you need the “Workspace administer” permission to edit roles.'}
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <caption className="sr-only">Permissions granted to each workspace role</caption>
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th scope="col" className="py-2 pr-4 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Permission</th>
              {roles.map((role) => (
                <th key={role} scope="col" className="w-32 px-2 py-2 text-center text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">{roleLabel(role)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_CATEGORIES.map((category) => (
              <Fragment key={category.label}>
                <tr className="bg-gray-50 dark:bg-gray-800/60">
                  <th scope="colgroup" colSpan={roles.length + 1} className="px-2 py-1.5 text-left text-xs font-semibold text-gray-800 dark:text-gray-200">
                    {category.label}
                  </th>
                </tr>
                {category.permissions.map((permission) => (
                  <tr key={permission} className="border-b border-gray-100 dark:border-gray-800">
                    <th scope="row" className="py-1 pr-4 text-left font-normal text-gray-800 dark:text-gray-200">{formatPermission(permission)}</th>
                    {roles.map((role) => {
                      const checked = draft[role]?.has(permission) ?? false;
                      const locked = isLocked(role, permission);
                      return (
                        <td key={role} className="px-2 py-0 text-center">
                          <label className="inline-grid h-11 w-11 cursor-pointer place-items-center rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 has-[:disabled]:cursor-not-allowed">
                            <span className="sr-only">{`${roleLabel(role)}: ${formatPermission(permission)}`}</span>
                            <input
                              type="checkbox"
                              className="h-4 w-4 cursor-pointer accent-indigo-600 disabled:cursor-not-allowed"
                              checked={locked || checked}
                              disabled={!canEdit || locked}
                              onChange={() => toggle(role, permission)}
                            />
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
          {canEdit && (
            <tfoot>
              <tr>
                <td className="py-3 pr-4 text-xs text-gray-600 dark:text-gray-400">Save per role</td>
                {roles.map((role) => {
                  const original = matrix.find((row) => row.role === role)?.permissions;
                  const dirty = !sameSet(draft[role], original);
                  const saving = saveMutation.isPending && saveMutation.variables === role;
                  return (
                    <td key={role} className="px-1 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Button
                          size="sm"
                          className="min-h-11 w-full"
                          disabled={!dirty || saveMutation.isPending}
                          isLoading={saving}
                          onClick={() => saveMutation.mutate(role)}
                          aria-label={`Save ${roleLabel(role)} permissions`}
                        >
                          <Save className="h-4 w-4" aria-hidden="true" /> Save
                        </Button>
                        {dirty && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="min-h-11 w-full"
                            onClick={() => setOverrides((current) => {
                              const next = { ...current };
                              delete next[role];
                              return next;
                            })}
                            aria-label={`Discard ${roleLabel(role)} changes`}
                          >
                            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset
                          </Button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}
