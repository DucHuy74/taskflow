import { useEffect, useId, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToastMessage } from '@/components/ui/toast';
import { getUserStory, updateUserStory } from '@/services/backlogService';
import { getApiErrorMessage, isForbidden, isVersionConflict } from '@/services/apiError';
import type { UserStory } from '@/types/userStory';

interface EditStoryDialogProps {
  story: UserStory | null;
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Replace a story everywhere it is cached (backlog list, sprint maps, sprint pages). */
function patchStoryCaches(queryClient: ReturnType<typeof useQueryClient>, workspaceId: string, updated: UserStory) {
  const merge = (story: UserStory) => (story.id === updated.id ? { ...story, ...updated } : story);
  queryClient.setQueryData<UserStory[]>(['backlog-stories', workspaceId], (current) => current?.map(merge));
  queryClient.setQueriesData<Record<string, UserStory[]>>({ queryKey: ['sprint-stories-map', workspaceId] }, (current) => {
    if (!current) return current;
    return Object.fromEntries(Object.entries(current).map(([sprintId, stories]) => [sprintId, stories.map(merge)]));
  });
}

export function EditStoryDialog({ story, workspaceId, open, onOpenChange }: EditStoryDialogProps) {
  const queryClient = useQueryClient();
  const showToast = useToastMessage();
  const textareaId = useId();
  const titleId = useId();
  const errorId = useId();

  const [text, setText] = useState(story?.storyText ?? '');
  const [version, setVersion] = useState<number | undefined>(story?.version);
  const [latest, setLatest] = useState<UserStory | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Parent remounts this dialog per story (key), so state is initialised from props.
  // Older list payloads may omit the version: fetch the current one before editing.
  const storyId = story?.id;
  const missingVersion = story?.version === undefined;
  useEffect(() => {
    if (!open || !storyId || !missingVersion) return;
    let cancelled = false;
    void getUserStory(storyId).then((fresh) => {
      if (!cancelled && fresh) setVersion(fresh.version);
    });
    return () => { cancelled = true; };
  }, [open, storyId, missingVersion]);

  if (!story) return null;

  const refreshLatest = async () => {
    setIsRefreshing(true);
    try {
      const fresh = await getUserStory(story.id);
      if (fresh) {
        setLatest(fresh);
        patchStoryCaches(queryClient, workspaceId, fresh);
      } else {
        setError('The latest version of this story could not be loaded. It may have been deleted.');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const storyText = text.trim();
    if (!storyText) {
      setError('Story text is required.');
      return;
    }
    if (version === undefined) {
      setError('Still loading the current story version. Please try again in a moment.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const updated = await updateUserStory(story.id, { storyText, version });
      patchStoryCaches(queryClient, workspaceId, updated);
      void queryClient.invalidateQueries({ queryKey: ['sprint-stories'] });
      showToast('Story updated.', 'success', 'Saved');
      onOpenChange(false);
    } catch (err) {
      if (isVersionConflict(err)) {
        setError('Someone else changed this story while you were editing. Review the latest version below, then save again.');
        await refreshLatest();
      } else if (isForbidden(err)) {
        setError('You do not have permission to edit stories in this workspace.');
      } else {
        setError(getApiErrorMessage(err, 'The story could not be saved. Please try again.'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const applyLatestText = () => {
    if (!latest) return;
    setText(latest.storyText);
    setVersion(latest.version);
    setLatest(null);
    setError('');
  };

  const keepMyText = () => {
    if (!latest) return;
    setVersion(latest.version);
    setLatest(null);
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-labelledby={titleId} className="sm:max-w-xl">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle id={titleId}>Edit story</DialogTitle>
            <DialogDescription>Changes are saved only if nobody else updated the story in the meantime.</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            <label htmlFor={textareaId} className="block text-sm font-semibold text-gray-800 dark:text-gray-200">Story text</label>
            <textarea
              id={textareaId}
              rows={5}
              value={text}
              onChange={(event) => setText(event.target.value)}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? errorId : undefined}
              className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-base leading-6 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-950 dark:text-white dark:focus:ring-indigo-900"
            />
            {version !== undefined && <p className="text-xs text-gray-600 dark:text-gray-400">Editing version {version}</p>}
          </div>

          {error && (
            <div id={errorId} role="alert" className="mt-4 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}

          {latest && (
            <section aria-label="Latest saved version" className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Latest saved version (v{latest.version})</h3>
                <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => void refreshLatest()} isLoading={isRefreshing} aria-label="Reload latest version">
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">{latest.storyText}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="min-h-11" onClick={applyLatestText}>Use latest text</Button>
                <Button type="button" variant="secondary" className="min-h-11" onClick={keepMyText}>Keep my text and retry</Button>
              </div>
            </section>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="min-h-11" isLoading={isSaving} disabled={Boolean(latest) || isSaving}>Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
