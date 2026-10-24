import { useState } from 'react';
import { Navigate, NavLink, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GitBranch, Layers3, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { workspaceService } from '@/services/workspaceService';
import { workspaceRoleService } from '@/services/workspaceRoleService';
import { GeneralTab } from '@/components/workspace-settings/GeneralTab';
import { MembersTab } from '@/components/workspace-settings/MembersTab';
import { PermissionsTab } from '@/components/workspace-settings/PermissionsTab';
import { GrantsTab } from '@/components/workspace-settings/GrantsTab';
import { roleLabel } from '@/components/workspace-settings/shared';
import { workspaceAccessQueryKey } from '@/lib/queryKeys';
import type { Permission } from '@/types/acl';

type TabId = 'general' | 'members' | 'permissions' | 'grants';

export function WorkspaceSettingsPage() {
  const { workspaceId = '' } = useParams<{ workspaceId: string }>();
  const [tab, setTab] = useState<TabId>('general');

  const { data: workspace, isLoading: workspaceLoading } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => workspaceService.getWorkspace(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const accessQuery = useQuery({
    queryKey: workspaceAccessQueryKey(workspaceId),
    queryFn: () => workspaceRoleService.getMyAccess(workspaceId),
    enabled: Boolean(workspaceId),
    retry: false,
  });

  if (!workspaceId) return <Navigate to="/" replace />;

  const permissions = new Set<Permission>(accessQuery.data?.permissions ?? []);
  const can = (permission: Permission) => permissions.has(permission);
  const canReadAcl = can('ACL_READ') || can('ACL_WRITE') || can('ACL_FULL_CONTROL');
  const canWriteAcl = can('ACL_WRITE') || can('ACL_FULL_CONTROL');

  const tabs: { id: TabId; label: string; visible: boolean }[] = [
    { id: 'general', label: 'General', visible: true },
    { id: 'members', label: 'Members', visible: true },
    { id: 'permissions', label: 'Permissions', visible: true },
    { id: 'grants', label: 'Access grants', visible: canReadAcl },
  ];
  const visibleTabs = tabs.filter((item) => item.visible);
  const activeTab = visibleTabs.some((item) => item.id === tab) ? tab : 'general';

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const last = visibleTabs.length - 1;
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? last
      : event.key === 'ArrowRight' ? (index === last ? 0 : index + 1) : (index === 0 ? last : index - 1);
    const next = visibleTabs[nextIndex];
    setTab(next.id);
    document.getElementById(`settings-tab-${next.id}`)?.focus();
  };

  return (
    <div className="min-h-full bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5">
          <nav className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400" aria-label="Breadcrumb">
            Workspaces / {workspace?.name || 'Workspace'}
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Workspace settings</h1>
          {accessQuery.data && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Your role: <span className="font-semibold text-slate-800 dark:text-slate-200">{roleLabel(accessQuery.data.role)}</span>
            </p>
          )}
        </div>

        <div className="mb-5 flex items-center gap-5 border-b border-slate-200 dark:border-slate-800">
          <NavLink to={`/workspace/${workspaceId}/backlog`} className="flex min-h-11 items-center gap-2 border-b-2 border-transparent text-sm font-medium text-slate-600 no-underline hover:border-slate-300 dark:hover:border-slate-700 dark:text-slate-300"><Layers3 className="h-4 w-4" aria-hidden="true" /> Backlog</NavLink>
          <NavLink to={`/workspace/${workspaceId}/graph`} className="flex min-h-11 items-center gap-2 border-b-2 border-transparent text-sm font-medium text-slate-600 no-underline hover:border-slate-300 dark:hover:border-slate-700 dark:text-slate-300"><GitBranch className="h-4 w-4" aria-hidden="true" /> Story map</NavLink>
          <span aria-current="page" className="flex min-h-11 items-center gap-2 border-b-2 border-indigo-600 text-sm font-semibold text-indigo-700 dark:text-indigo-300"><SettingsIcon className="h-4 w-4" aria-hidden="true" /> Settings</span>
        </div>

        {workspaceLoading || accessQuery.isLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading workspace settings">
            <Skeleton className="h-11 w-80" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !workspace ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
            This workspace was not found or you are not a member.
          </p>
        ) : accessQuery.isError ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
            Your access to this workspace could not be loaded.
          </p>
        ) : (
          <>
            <div role="tablist" aria-label="Workspace settings sections" className="mb-5 flex flex-wrap gap-1 rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800">
              {visibleTabs.map((item, index) => (
                <button
                  key={item.id}
                  id={`settings-tab-${item.id}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === item.id}
                  aria-controls={`settings-panel-${item.id}`}
                  tabIndex={activeTab === item.id ? 0 : -1}
                  onClick={() => setTab(item.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className={cn(
                    'min-h-11 cursor-pointer rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                    activeTab === item.id
                      ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-950 dark:text-indigo-300'
                      : 'text-slate-700 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-700',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div id={`settings-panel-${activeTab}`} role="tabpanel" aria-labelledby={`settings-tab-${activeTab}`}>
              {activeTab === 'general' && (
                <GeneralTab key={`${workspace.id}:${workspace.updatedAt ?? ''}:${workspace.name}:${workspace.type}:${workspace.access}`} workspace={workspace} canEdit={can('WORKSPACE_ADMINISTER')} canDelete={can('WORKSPACE_DELETE')} />
              )}
              {activeTab === 'members' && (
                <MembersTab
                  workspaceId={workspaceId}
                  canView={can('MEMBER_VIEW')}
                  canManage={can('MEMBER_MANAGE')}
                  canInvite={can('MEMBER_INVITE')}
                />
              )}
              {activeTab === 'permissions' && <PermissionsTab workspaceId={workspaceId} canEdit={can('WORKSPACE_ADMINISTER')} />}
              {activeTab === 'grants' && canReadAcl && <GrantsTab workspaceId={workspaceId} canWrite={canWriteAcl} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
