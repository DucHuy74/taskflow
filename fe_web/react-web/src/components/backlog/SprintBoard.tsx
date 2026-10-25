import { useId, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CheckCircle2, ChevronDown, Lock, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserStoryCard } from './UserStoryCard';
import { SprintActionsMenu } from './SprintActionsMenu';
import { formatSprintDateRange } from '@/lib/sprintDates';
import { SPRINT_STATUS_LABELS } from '@/lib/sprintLifecycle';
import type { Sprint } from '@/types/sprint';
import type { UserStory, UserStoryStatus } from '@/types/userStory';

interface SprintBoardProps {
  sprint: Sprint;
  stories: UserStory[];
  isLoading?: boolean;
  /** ToDo sprints only. */
  onStartSprint: () => void;
  /** InProgress sprints only; should open the confirmation dialog. */
  onCompleteSprint?: () => void;
  onViewGraph?: () => void;
  isStarting?: boolean;
  isCompleting?: boolean;
  /** Name of another InProgress sprint of the workspace; while set, this sprint cannot be started. */
  activeSprintName?: string | null;
  onEditStory?: (story: UserStory) => void;
  /** Opens the edit-sprint dialog (rename + dates). */
  onEditSprint?: () => void;
  /** Status change from a card's "Change status" select (only offered while the sprint is InProgress). */
  onChangeStoryStatus?: (story: UserStory, status: UserStoryStatus) => void;
}

const columns = [
  { id: 'ToDo', title: 'To Do', color: 'bg-gray-100 dark:bg-slate-800' },
  { id: 'InProgress', title: 'In Progress', color: 'bg-blue-100 dark:bg-blue-950/60' },
  { id: 'Done', title: 'Done', color: 'bg-green-100 dark:bg-green-950/60' },
] as const;

const sprintStatusBadge: Record<Sprint['status'], string> = {
  ToDo: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  InProgress: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-900',
  Done: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-900',
};

const actionButtonClass = cn(
  'inline-flex min-h-11 items-center gap-1.5 px-3 text-sm font-medium rounded border transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
  'disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:cursor-not-allowed'
);

function KanbanColumn({
  column,
  stories,
  sprintId,
  readOnly,
  onEditStory,
  onChangeStoryStatus,
}: {
  column: (typeof columns)[number];
  stories: UserStory[];
  sprintId: string;
  readOnly: boolean;
  onEditStory?: (story: UserStory) => void;
  onChangeStoryStatus?: (story: UserStory, status: UserStoryStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    // Unique per sprint: every sprint board renders its own three columns.
    id: `sprint-${sprintId}-${column.id}`,
    data: { type: 'sprint-column', status: column.id, sprintId },
    disabled: readOnly,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 min-w-[250px] max-w-[320px] bg-gray-50/80 dark:bg-slate-950/80 rounded-lg p-2 transition-colors',
        isOver && 'bg-blue-50 dark:bg-blue-950/40 ring-2 ring-blue-200 dark:ring-blue-800'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', column.id === 'ToDo' ? 'bg-gray-400' : column.id === 'InProgress' ? 'bg-blue-500' : 'bg-green-500')} />
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{column.title}</span>
        </div>
        <span className="text-xs text-gray-400 dark:text-slate-500">{stories.length}</span>
      </div>

      {/* Column Content */}
      <SortableContext items={stories.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[80px] *:rounded-md *:shadow-sm dark:*:ring-1 dark:*:ring-slate-800">
          {stories.map((story) => (
            <UserStoryCard
              key={story.id}
              story={{ ...story, status: column.id, sprintId }}
              draggable={!readOnly}
              onEdit={onEditStory && !readOnly ? () => onEditStory(story) : undefined}
              onStatusChange={onChangeStoryStatus}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function SprintBoard({
  sprint,
  stories,
  isLoading,
  onStartSprint,
  onCompleteSprint,
  onViewGraph,
  isStarting = false,
  isCompleting = false,
  activeSprintName,
  onEditStory,
  onEditSprint,
  onChangeStoryStatus,
}: SprintBoardProps) {
  const id = useId();
  const isDone = sprint.status === 'Done';
  const isActive = sprint.status === 'InProgress';
  // Completed sprints are history: collapsed by default and read-only.
  const [expanded, setExpanded] = useState(!isDone);
  const [seenStatus, setSeenStatus] = useState(sprint.status);
  if (seenStatus !== sprint.status) {
    // Re-derive the default when the status changes (e.g. collapse right after completing).
    setSeenStatus(sprint.status);
    setExpanded(sprint.status !== 'Done');
  }
  const { setNodeRef, isOver } = useDroppable({
    id: `sprint-${sprint.id}`,
    data: { type: 'sprint', sprint },
    disabled: isDone,
  });

  const storiesByStatus = {
    ToDo: stories.filter((s) => s.status === 'ToDo'),
    InProgress: stories.filter((s) => s.status === 'InProgress'),
    Done: stories.filter((s) => s.status === 'Done'),
  };

  const dateRange = formatSprintDateRange(sprint.startDate, sprint.endDate);
  const startBlocked = sprint.status === 'ToDo' && Boolean(activeSprintName);
  const startBlockedReason = startBlocked ? `“${activeSprintName}” is in progress. Complete it before starting this sprint.` : undefined;
  const contentId = `${id}-content`;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800">
          <div className="h-5 w-32 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="p-4">
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-1 min-w-[250px] h-48 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`${id}-title`}
      className={cn(
        'bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800 shadow-sm transition-all',
        isOver && 'border-2 border-dashed border-green-400 bg-green-50/30 dark:border-green-600 dark:bg-green-950/40'
      )}
    >
      {/* Sprint Header */}
      <div className={cn('px-4 py-2 flex flex-wrap items-center justify-between gap-2 bg-gray-50/50 dark:bg-slate-950/50 rounded-t-lg', expanded ? 'border-b border-gray-100 dark:border-slate-800' : 'rounded-b-lg')}>
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls={contentId}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${sprint.name}`}
            className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <ChevronDown className={cn('h-5 w-5 transition-transform motion-reduce:transition-none', !expanded && '-rotate-90')} aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id={`${id}-title`} className="truncate font-semibold text-gray-900 dark:text-slate-100">{sprint.name}</h3>
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', sprintStatusBadge[sprint.status])}>
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400" aria-hidden="true" />}
                {isDone && <Lock className="h-3 w-3" aria-hidden="true" />}
                <span className="sr-only">Status: </span>{SPRINT_STATUS_LABELS[sprint.status]}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              {dateRange || 'No dates set'}
              <span aria-hidden="true"> · </span>
              {storiesByStatus.Done.length}/{stories.length} done
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onViewGraph}
            className={cn(actionButtonClass, 'border-gray-200 dark:border-slate-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60')}
          >
            View Graph
          </button>
          {sprint.status === 'ToDo' && (
            <button
              type="button"
              onClick={() => { if (!startBlocked && !isStarting) onStartSprint(); }}
              disabled={isStarting}
              aria-disabled={startBlocked || undefined}
              aria-describedby={startBlocked ? `${id}-start-blocked` : undefined}
              title={startBlockedReason}
              className={cn(
                actionButtonClass,
                'border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-gray-700 dark:text-slate-300',
                startBlocked ? 'cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-slate-800'
              )}
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              {isStarting ? 'Starting…' : 'Start sprint'}
            </button>
          )}
          {isActive && onCompleteSprint && (
            <button
              type="button"
              onClick={onCompleteSprint}
              disabled={isCompleting}
              className={cn(actionButtonClass, 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500')}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {isCompleting ? 'Completing…' : 'Complete sprint'}
            </button>
          )}
          {onEditSprint && (
            <SprintActionsMenu
              sprintName={sprint.name}
              onEditSprint={onEditSprint}
              onCompleteSprint={isActive ? onCompleteSprint : undefined}
            />
          )}
        </div>
        {startBlocked && (
          <p id={`${id}-start-blocked`} className="basis-full pb-1 pl-[52px] text-xs text-amber-700 dark:text-amber-300">
            {startBlockedReason}
          </p>
        )}
      </div>

      {/* Kanban Columns */}
      <div id={contentId} hidden={!expanded}>
        {isDone && (
          <p className="flex items-center gap-2 px-4 pt-3 text-xs text-gray-500 dark:text-slate-400">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" /> This sprint is completed and read-only. Unfinished stories were returned to the backlog.
          </p>
        )}
        {sprint.status === 'ToDo' && stories.length > 0 && (
          <p className="px-4 pt-3 text-xs text-gray-500 dark:text-slate-400">Start the sprint to move stories between columns.</p>
        )}
        {stories.length === 0 ? (
          <div className={cn('flex flex-col items-center justify-center py-10 text-gray-400 dark:text-slate-500 transition-colors', isOver && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300')}>
            <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            {isDone ? (
              <p className="text-sm font-medium">No stories were completed in this sprint</p>
            ) : (
              <>
                <p className="text-sm font-medium">Drop a backlog story here</p>
                <p className="mt-1 text-xs">It will be added to this sprint.</p>
              </>
            )}
          </div>
        ) : (
          <div className="p-4">
            <div className="flex gap-4 overflow-x-auto pb-2">
              {columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  stories={storiesByStatus[column.id]}
                  sprintId={sprint.id}
                  readOnly={isDone}
                  onEditStory={onEditStory}
                  onChangeStoryStatus={isActive ? onChangeStoryStatus : undefined}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// Empty state for no sprints
export function SprintBoardEmpty() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800 shadow-sm">
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Plan your sprint</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 text-center max-w-sm">
          Drag work items from the Backlog section or create new ones.
        </p>
      </div>
    </div>
  );
}
