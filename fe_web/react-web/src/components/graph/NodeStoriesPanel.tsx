import { useState } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, FileText, Route } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useStoryStatusMutation } from '@/hooks/useSprintMutations';
import { STORY_STATUS_OPTIONS, storyStatusLabel } from '@/lib/sprintLifecycle';
import { cn } from '@/lib/utils';
import { getUserStory } from '@/services/backlogService';
import { sprintService } from '@/services/sprintService';
import type { Sprint } from '@/types/sprint';
import type { UserStory, UserStoryStatus } from '@/types/userStory';

const VISIBLE_COUNT = 6;

const statusColors: Record<UserStoryStatus, string> = {
  ToDo: 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300',
  InProgress: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
  Done: 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300',
};

const userStoryQueryKey = (storyId: string) => ['user-story', storyId] as const;

interface NodeStoriesPanelProps {
  workspaceId: string;
  /** Stories whose S–V–O triple contains the selected term. */
  storyIds: string[];
  highlightedStoryId: string | null;
  onHighlightStory: (storyId: string | null) => void;
}

/**
 * Lists the user stories behind a selected graph term. Stories in an in-progress sprint get a status
 * control; others explain why their status cannot change from here.
 */
export function NodeStoriesPanel({ workspaceId, storyIds, highlightedStoryId, onHighlightStory }: NodeStoriesPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const { data: sprints = [] } = useQuery({
    queryKey: ['sprints', workspaceId],
    queryFn: () => sprintService.getSprints(workspaceId),
  });
  const visibleIds = showAll ? storyIds : storyIds.slice(0, VISIBLE_COUNT);
  const stories = useQueries({
    queries: visibleIds.map((id) => ({
      queryKey: userStoryQueryKey(id),
      queryFn: () => getUserStory(id),
      staleTime: 30_000,
    })),
  });

  if (!storyIds.length) {
    return <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No user story is linked to this term yet. Run the analysis or rebuild the graph.</p>;
  }

  return (
    <div>
      <ul className="mt-3 space-y-2">
        {visibleIds.map((id, index) => {
          const query = stories[index];
          return (
            <li key={id}>
              {query?.isLoading ? (
                <Skeleton className="h-24 w-full rounded-lg" />
              ) : query?.data ? (
                <StoryRow
                  workspaceId={workspaceId}
                  story={query.data}
                  sprint={sprints.find((sprint) => sprint.id === query.data?.sprintId)}
                  highlighted={highlightedStoryId === id}
                  onToggleHighlight={() => onHighlightStory(highlightedStoryId === id ? null : id)}
                />
              ) : (
                <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Story <code className="break-all">{id}</code> is not available. It may have been deleted.
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {storyIds.length > VISIBLE_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="mt-2 min-h-11 w-full cursor-pointer rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:bg-indigo-950/50"
        >
          {showAll ? 'Show fewer stories' : `Show all ${storyIds.length} stories`}
        </button>
      )}
    </div>
  );
}

interface StoryRowProps {
  workspaceId: string;
  story: UserStory;
  sprint: Sprint | undefined;
  highlighted: boolean;
  onToggleHighlight: () => void;
}

function StoryRow({ workspaceId, story, sprint, highlighted, onToggleHighlight }: StoryRowProps) {
  const queryClient = useQueryClient();
  const statusMutation = useStoryStatusMutation(workspaceId);
  const canChangeStatus = Boolean(sprint && sprint.status === 'InProgress');

  const changeStatus = (status: UserStoryStatus) => {
    if (!sprint || status === story.status) return;
    const key = userStoryQueryKey(story.id);
    const previous = queryClient.getQueryData<UserStory | null>(key);
    const optimistic: UserStory = { ...story, status };
    queryClient.setQueryData(key, optimistic);
    statusMutation.mutate(
      { story, sprintId: sprint.id, status },
      {
        onError: () => queryClient.setQueryData(key, previous),
        onSettled: () => void queryClient.invalidateQueries({ queryKey: key }),
      },
    );
  };

  const location = sprint ? sprint.name : 'Backlog';
  const hint = !sprint
    ? 'In the backlog. Add it to a sprint and start the sprint to track progress.'
    : sprint.status === 'ToDo'
      ? 'Start the sprint to change this story’s status.'
      : sprint.status === 'Done'
        ? 'The sprint is completed, so its stories are read-only.'
        : null;

  return (
    <article
      className={cn(
        'rounded-lg border p-3 transition-colors',
        highlighted
          ? 'border-amber-400 bg-amber-50/70 dark:border-amber-500/70 dark:bg-amber-950/30'
          : 'border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/40',
      )}
    >
      <div className="flex items-start gap-2">
        <FileText aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
        <p className="min-w-0 text-sm leading-5 text-slate-800 [overflow-wrap:anywhere] line-clamp-4 dark:text-slate-100" title={story.storyText}>
          {story.storyText}
        </p>
      </div>
      <p className="mt-1.5 pl-6 text-xs text-slate-500 dark:text-slate-400">{location}</p>

      <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
        {canChangeStatus ? (
          <span className="relative inline-flex">
            <select
              value={story.status}
              disabled={statusMutation.isPending}
              onChange={(event) => changeStatus(event.target.value as UserStoryStatus)}
              aria-label={`Change status: ${story.storyText}`}
              title="Change status"
              className={cn(
                'h-11 cursor-pointer appearance-none rounded-lg border border-transparent py-0 pl-2.5 pr-7 text-xs font-semibold transition-colors',
                'hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-wait disabled:opacity-60 dark:hover:border-slate-600',
                statusColors[story.status],
              )}
            >
              {STORY_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">{option.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-70" aria-hidden="true" />
          </span>
        ) : (
          <span className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold', statusColors[story.status])}>
            {storyStatusLabel(story.status)}
          </span>
        )}
        <button
          type="button"
          onClick={onToggleHighlight}
          aria-pressed={highlighted}
          className={cn(
            'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
            highlighted
              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:hover:bg-amber-500/30'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
          )}
        >
          <Route aria-hidden="true" className="h-3.5 w-3.5" />
          {highlighted ? 'Highlighted' : 'Highlight in graph'}
        </button>
      </div>
      {hint && <p className="mt-1.5 pl-6 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </article>
  );
}
