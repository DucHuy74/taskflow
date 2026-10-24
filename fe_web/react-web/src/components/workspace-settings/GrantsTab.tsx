import { useId, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToastMessage } from '@/components/ui/toast';
import { workspaceRoleService } from '@/services/workspaceRoleService';
import { workspaceService } from '@/services/workspaceService';
import { sprintService } from '@/services/sprintService';
import { getBacklogStories } from '@/services/backlogService';
import { getApiErrorMessage } from '@/services/apiError';
import { membersQueryKey, workspaceAccessQueryKey } from '@/lib/queryKeys';
import {
  PERMISSIONS,
  formatPermission,
  type Permission,
  type PermissionEffect,
  type PrincipalType,
  type ResourceGrantResponse,
  type ResourceType,
} from '@/types/acl';
import { WORKSPACE_ROLES, fieldClass, labelClass, panelClass, roleLabel } from './shared';

interface GrantsTabProps {
  workspaceId: string;
  canWrite: boolean;
}

const RESOURCE_TYPES: ResourceType[] = ['WORKSPACE', 'SPRINT', 'USER_STORY'];
const resourceTypeLabel: Record<ResourceType, string> = { WORKSPACE: 'Workspace', SPRINT: 'Sprint', USER_STORY: 'User story' };

const grantsKey = (workspaceId: string, resourceType: string, resourceId: string) =>
  ['workspace-grants', workspaceId, resourceType, resourceId] as const;

export function GrantsTab({ workspaceId, canWrite }: GrantsTabProps) {
  const queryClient = useQueryClient();
  const showToast = useToastMessage();
  const ids = {
    filterType: useId(), filterId: useId(), resourceType: useId(), resourceId: useId(), principalType: useId(),
    principalId: useId(), permission: useId(), effect: useId(),
  };

  // Filters (backend only filters when BOTH resourceType and resourceId are set).
  const [filterType, setFilterType] = useState<ResourceType | ''>('');
  const [filterId, setFilterId] = useState('');
  const activeFilterId = filterType && filterId.trim() ? filterId.trim() : '';

  const { data: grants = [], isLoading, isError } = useQuery({
    queryKey: grantsKey(workspaceId, activeFilterId ? filterType : '', activeFilterId),
    queryFn: () => workspaceRoleService.listGrants(
      workspaceId,
      activeFilterId ? { resourceType: filterType as ResourceType, resourceId: activeFilterId } : {},
    ),
  });

  // Lookup data so people can pick resources/principals by name instead of raw ids.
  const { data: members = [] } = useQuery({
    queryKey: membersQueryKey(workspaceId),
    queryFn: () => workspaceService.getWorkspaceMembers(workspaceId),
  });
  const { data: sprints = [] } = useQuery({
    queryKey: ['sprints', workspaceId],
    queryFn: () => sprintService.getSprints(workspaceId),
  });
  const { data: stories = [] } = useQuery({
    queryKey: ['backlog-stories', workspaceId],
    queryFn: () => getBacklogStories(workspaceId),
  });

  const [resourceType, setResourceType] = useState<ResourceType>('WORKSPACE');
  const [resourceId, setResourceId] = useState(workspaceId);
  const [principalType, setPrincipalType] = useState<PrincipalType>('ROLE');
  const [principalId, setPrincipalId] = useState<string>('MEMBER');
  const [permission, setPermission] = useState<Permission>('ISSUE_VIEW');
  const [effect, setEffect] = useState<PermissionEffect>('ALLOW');
  const [formError, setFormError] = useState('');

  const resourceName = useMemo(() => {
    const map = new Map<string, string>([[workspaceId, 'This workspace']]);
    sprints.forEach((sprint) => map.set(sprint.id, `Sprint: ${sprint.name}`));
    stories.forEach((story) => map.set(story.id, `Story: ${story.storyText.slice(0, 60)}`));
    return (id: string) => map.get(id) ?? id;
  }, [workspaceId, sprints, stories]);

  const principalName = (grant: ResourceGrantResponse) =>
    grant.principalType === 'ROLE'
      ? `Role: ${roleLabel(grant.principalId)}`
      : members.find((member) => member.userId === grant.principalId)?.email ?? grant.principalId;

  const invalidateGrants = () => {
    void queryClient.invalidateQueries({ queryKey: ['workspace-grants', workspaceId] });
    void queryClient.invalidateQueries({ queryKey: workspaceAccessQueryKey(workspaceId) });
  };

  const createMutation = useMutation({
    mutationFn: () => workspaceRoleService.createGrant(workspaceId, {
      resourceType, resourceId: resourceId.trim(), principalType, principalId: principalId.trim(), permission, effect,
    }),
    onSuccess: () => {
      showToast('Access grant created.', 'success', 'Grant added');
      invalidateGrants();
    },
    onError: (error) => setFormError(getApiErrorMessage(error, 'The grant could not be created.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (grantId: string) => workspaceRoleService.deleteGrant(workspaceId, grantId),
    onSuccess: () => {
      showToast('Access grant removed.', 'success', 'Grant removed');
      invalidateGrants();
    },
    onError: (error) => showToast(getApiErrorMessage(error, 'The grant could not be removed.'), 'error', 'Delete failed'),
  });

  const handleResourceTypeChange = (next: ResourceType) => {
    setResourceType(next);
    setResourceId(next === 'WORKSPACE' ? workspaceId : next === 'SPRINT' ? sprints[0]?.id ?? '' : stories[0]?.id ?? '');
  };

  const handlePrincipalTypeChange = (next: PrincipalType) => {
    setPrincipalType(next);
    setPrincipalId(next === 'ROLE' ? 'MEMBER' : members[0]?.userId ?? '');
  };

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!resourceId.trim() || !principalId.trim()) {
      setFormError('Choose a resource and a principal.');
      return;
    }
    setFormError('');
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {canWrite && (
        <form onSubmit={handleCreate} className={panelClass} aria-labelledby="grant-create-heading" noValidate>
          <h2 id="grant-create-heading" className="text-base font-semibold text-gray-900 dark:text-gray-100">Add access grant</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Allow or deny one permission on a specific resource for a user or role. Deny wins over allow.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor={ids.resourceType} className={labelClass}>Resource type</label>
              <select id={ids.resourceType} value={resourceType} onChange={(event) => handleResourceTypeChange(event.target.value as ResourceType)} className={fieldClass}>
                {RESOURCE_TYPES.map((type) => <option key={type} value={type}>{resourceTypeLabel[type]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={ids.resourceId} className={labelClass}>Resource</label>
              {resourceType === 'WORKSPACE' ? (
                <select id={ids.resourceId} value={resourceId} onChange={(event) => setResourceId(event.target.value)} className={fieldClass}>
                  <option value={workspaceId}>This workspace</option>
                </select>
              ) : resourceType === 'SPRINT' && sprints.length > 0 ? (
                <select id={ids.resourceId} value={resourceId} onChange={(event) => setResourceId(event.target.value)} className={fieldClass}>
                  {sprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
                </select>
              ) : resourceType === 'USER_STORY' && stories.length > 0 ? (
                <select id={ids.resourceId} value={resourceId} onChange={(event) => setResourceId(event.target.value)} className={fieldClass}>
                  {stories.map((story) => <option key={story.id} value={story.id}>{story.storyText.slice(0, 80)}</option>)}
                </select>
              ) : (
                <input id={ids.resourceId} value={resourceId} onChange={(event) => setResourceId(event.target.value)} placeholder="Resource id" className={fieldClass} />
              )}
            </div>
            <div>
              <label htmlFor={ids.principalType} className={labelClass}>Applies to</label>
              <select id={ids.principalType} value={principalType} onChange={(event) => handlePrincipalTypeChange(event.target.value as PrincipalType)} className={fieldClass}>
                <option value="ROLE">Role</option>
                <option value="USER">User</option>
              </select>
            </div>
            <div>
              <label htmlFor={ids.principalId} className={labelClass}>{principalType === 'ROLE' ? 'Role' : 'User'}</label>
              {principalType === 'ROLE' ? (
                <select id={ids.principalId} value={principalId} onChange={(event) => setPrincipalId(event.target.value)} className={fieldClass}>
                  {WORKSPACE_ROLES.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
                </select>
              ) : members.length > 0 ? (
                <select id={ids.principalId} value={principalId} onChange={(event) => setPrincipalId(event.target.value)} className={fieldClass}>
                  {members.map((member) => <option key={member.userId} value={member.userId}>{member.email || member.userId}</option>)}
                </select>
              ) : (
                <input id={ids.principalId} value={principalId} onChange={(event) => setPrincipalId(event.target.value)} placeholder="User id" className={fieldClass} />
              )}
            </div>
            <div>
              <label htmlFor={ids.permission} className={labelClass}>Permission</label>
              <select id={ids.permission} value={permission} onChange={(event) => setPermission(event.target.value as Permission)} className={fieldClass}>
                {PERMISSIONS.map((item) => <option key={item} value={item}>{formatPermission(item)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={ids.effect} className={labelClass}>Effect</label>
              <select id={ids.effect} value={effect} onChange={(event) => setEffect(event.target.value as PermissionEffect)} className={fieldClass}>
                <option value="ALLOW">Allow</option>
                <option value="DENY">Deny</option>
              </select>
            </div>
          </div>
          {formError && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{formError}</p>}
          <div className="mt-5 flex justify-end">
            <Button type="submit" className="min-h-11" isLoading={createMutation.isPending}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add grant
            </Button>
          </div>
        </form>
      )}

      <section className={panelClass} aria-labelledby="grant-list-heading">
        <h2 id="grant-list-heading" className="text-base font-semibold text-gray-900 dark:text-gray-100">Access grants</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={ids.filterType} className={labelClass}>Filter by resource type</label>
            <select id={ids.filterType} value={filterType} onChange={(event) => setFilterType(event.target.value as ResourceType | '')} className={fieldClass}>
              <option value="">All resources</option>
              {RESOURCE_TYPES.map((type) => <option key={type} value={type}>{resourceTypeLabel[type]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={ids.filterId} className={labelClass}>Resource id</label>
            <input
              id={ids.filterId}
              value={filterId}
              onChange={(event) => setFilterId(event.target.value)}
              disabled={!filterType}
              placeholder={filterType ? 'Paste a resource id' : 'Choose a type first'}
              className={fieldClass}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="mt-4 space-y-2">{[1, 2].map((item) => <Skeleton key={item} className="h-12 w-full" />)}</div>
        ) : isError ? (
          <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">Access grants could not be loaded.</p>
        ) : grants.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">No access grants yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Resource access grants</caption>
              <thead className="border-b border-gray-200 text-xs uppercase text-gray-600 dark:border-gray-700 dark:text-gray-400">
                <tr>
                  <th scope="col" className="py-2 pr-3">Resource</th>
                  <th scope="col" className="py-2 pr-3">Principal</th>
                  <th scope="col" className="py-2 pr-3">Permission</th>
                  <th scope="col" className="py-2 pr-3">Effect</th>
                  {canWrite && <th scope="col" className="py-2"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {grants.map((grant) => (
                  <tr key={grant.id} className="text-gray-800 dark:text-gray-200">
                    <td className="py-2 pr-3">
                      <span className="block text-xs text-gray-600 dark:text-gray-400">{resourceTypeLabel[grant.resourceType] ?? grant.resourceType}</span>
                      <span className="break-all">{resourceName(grant.resourceId)}</span>
                    </td>
                    <td className="break-all py-2 pr-3">{principalName(grant)}</td>
                    <td className="py-2 pr-3">{formatPermission(grant.permission)}</td>
                    <td className="py-2 pr-3">
                      <span className={grant.effect === 'DENY'
                        ? 'rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300'
                        : 'rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}>
                        {grant.effect === 'DENY' ? 'Deny' : 'Allow'}
                      </span>
                    </td>
                    {canWrite && (
                      <td className="py-1 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950"
                          onClick={() => deleteMutation.mutate(grant.id)}
                          disabled={deleteMutation.isPending && deleteMutation.variables === grant.id}
                          aria-label={`Remove ${grant.effect.toLowerCase()} ${formatPermission(grant.permission)} grant for ${principalName(grant)}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
