import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToastMessage } from '@/components/ui/toast';
import { workspaceService } from '@/services/workspaceService';
import { WorkspaceAccess, WorkspaceType, type Workspace } from '@/types/workspace';
import { fieldClass, labelClass, panelClass } from './shared';

interface GeneralTabProps {
  workspace: Workspace;
  canEdit: boolean;
  canDelete: boolean;
}

export function GeneralTab({ workspace, canEdit, canDelete }: GeneralTabProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToastMessage();
  const ids = { name: useId(), type: useId(), access: useId(), confirm: useId(), deleteTitle: useId() };

  const [name, setName] = useState(workspace.name);
  const [type, setType] = useState<WorkspaceType>(workspace.type ?? WorkspaceType.TEAM_MANAGED);
  const [access, setAccess] = useState<WorkspaceAccess>(workspace.access ?? WorkspaceAccess.PRIVATE);
  const [nameError, setNameError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const dirty = name.trim() !== workspace.name || type !== workspace.type || access !== workspace.access;

  const updateMutation = useMutation({
    mutationFn: async () => {
      const updated = await workspaceService.updateWorkspace(workspace.id, { name: name.trim(), type, access });
      if (!updated) throw new Error('update failed');
      return updated;
    },
    onSuccess: () => {
      showToast('Workspace settings saved.', 'success', 'Saved');
      void queryClient.invalidateQueries({ queryKey: ['workspace', workspace.id] });
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
    onError: () => showToast('The workspace could not be updated. You may not have permission.', 'error', 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!await workspaceService.deleteWorkspace(workspace.id)) throw new Error('delete failed');
    },
    onSuccess: () => {
      showToast(`Workspace "${workspace.name}" was deleted.`, 'success', 'Deleted');
      setDeleteOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.removeQueries({ queryKey: ['workspace', workspace.id] });
      navigate('/', { replace: true });
    },
    onError: () => showToast('The workspace could not be deleted. You may not have permission.', 'error', 'Delete failed'),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setNameError('Workspace name is required.');
      return;
    }
    setNameError('');
    updateMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className={panelClass} aria-labelledby="general-heading" noValidate>
        <h2 id="general-heading" className="text-base font-semibold text-gray-900 dark:text-gray-100">Workspace details</h2>
        {!canEdit && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">You need the “Workspace administer” permission to change these settings.</p>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor={ids.name} className={labelClass}>Name</label>
            <input
              id={ids.name}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!canEdit}
              className={fieldClass}
              aria-invalid={Boolean(nameError) || undefined}
              aria-describedby={nameError ? `${ids.name}-error` : undefined}
              required
            />
            {nameError && <p id={`${ids.name}-error`} className="mt-1 text-sm text-red-700 dark:text-red-300">{nameError}</p>}
          </div>
          <div>
            <label htmlFor={ids.type} className={labelClass}>Management type</label>
            <select id={ids.type} value={type} onChange={(event) => setType(event.target.value as WorkspaceType)} disabled={!canEdit} className={fieldClass}>
              <option value={WorkspaceType.TEAM_MANAGED}>Team-managed</option>
              <option value={WorkspaceType.COMPANY_MANAGED}>Company-managed</option>
            </select>
          </div>
          <div>
            <label htmlFor={ids.access} className={labelClass}>Access</label>
            <select id={ids.access} value={access} onChange={(event) => setAccess(event.target.value as WorkspaceAccess)} disabled={!canEdit} className={fieldClass}>
              <option value={WorkspaceAccess.PRIVATE}>Private</option>
              <option value={WorkspaceAccess.LIMITED}>Limited</option>
              <option value={WorkspaceAccess.OPEN}>Open</option>
            </select>
          </div>
        </div>
        {canEdit && (
          <div className="mt-5 flex justify-end">
            <Button type="submit" className="min-h-11" isLoading={updateMutation.isPending} disabled={!dirty}>
              <Save className="h-4 w-4" aria-hidden="true" /> Save changes
            </Button>
          </div>
        )}
      </form>

      {canDelete && (
        <section className={`${panelClass} border-red-200 dark:border-red-900`} aria-labelledby="danger-heading">
          <h2 id="danger-heading" className="text-base font-semibold text-red-700 dark:text-red-300">Danger zone</h2>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">Deleting a workspace removes its backlog, sprints and stories for every member. This cannot be undone.</p>
          <Button variant="destructive" className="mt-4 min-h-11" onClick={() => { setConfirmText(''); setDeleteOpen(true); }}>
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete workspace
          </Button>
        </section>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent aria-labelledby={ids.deleteTitle} className="sm:max-w-md">
          <form onSubmit={(event) => { event.preventDefault(); if (confirmText === workspace.name) deleteMutation.mutate(); }}>
            <DialogHeader>
              <DialogTitle id={ids.deleteTitle} className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" /> Delete workspace?
              </DialogTitle>
              <DialogDescription>
                Type <strong className="font-semibold text-gray-900 dark:text-gray-100">{workspace.name}</strong> to confirm.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <label htmlFor={ids.confirm} className={labelClass}>Workspace name</label>
              <input id={ids.confirm} value={confirmText} onChange={(event) => setConfirmText(event.target.value)} className={fieldClass} autoComplete="off" />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" className="min-h-11" disabled={confirmText !== workspace.name} isLoading={deleteMutation.isPending}>
                Delete permanently
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
