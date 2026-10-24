import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { UserStoryCard } from './UserStoryCard';
import { SprintActionsMenu } from './SprintActionsMenu';
import { formatSprintDateRange } from '@/lib/sprintDates';
import type { Sprint } from '@/types/sprint';
import type { UserStory } from '@/types/userStory';

interface SprintBoardProps {
  sprint: Sprint;
  stories: UserStory[];
  isLoading?: boolean;
  onStartSprint: () => void;
  onViewGraph?: () => void;
  isStarting?: boolean;
  onEditStory?: (story: UserStory) => void;
  /** Opens the edit-sprint dialog (rename + dates). */
  onEditSprint?: () => void;
}

const columns = [
  { id: 'ToDo', title: 'To Do', color: 'bg-gray-100 dark:bg-slate-800' },
  { id: 'InProgress', title: 'In Progress', color: 'bg-blue-100 dark:bg-blue-950/60' },
  { id: 'Done', title: 'Done', color: 'bg-green-100 dark:bg-green-950/60' },
] as const;

function KanbanColumn({
  column,
  stories,
  sprintId,
  onEditStory,
}: {
  column: (typeof columns)[number];
  stories: UserStory[];
  sprintId: string;
  onEditStory?: (story: UserStory) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `sprint-${column.id}`,
    data: { type: 'sprint-column', status: column.id, sprintId },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 min-w-[250px] max-w-[320px] bg-gray-50/80 dark:bg-slate-950/80 rounded-lg p-2 transition-colors',
        isOver && 'bg-blue-50 dark:bg-blue-950/40 ring-2 ring-blue-200'
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
              draggable
              onEdit={onEditStory ? () => onEditStory(story) : undefined}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function SprintBoard({ sprint, stories, isLoading, onStartSprint, onViewGraph, isStarting = false, onEditStory, onEditSprint }: SprintBoardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `sprint-${sprint.id}`,
    data: { type: 'sprint', sprint },
  });

  const storiesByStatus = {
    ToDo: stories.filter((s) => s.status === 'ToDo'),
    InProgress: stories.filter((s) => s.status === 'InProgress'),
    Done: stories.filter((s) => s.status === 'Done'),
  };

  const dateRange = formatSprintDateRange(sprint.startDate, sprint.endDate);

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
    <div
      ref={setNodeRef}
      className={cn(
        'bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800 shadow-sm transition-all',
        isOver && 'border-2 border-dashed border-green-400 bg-green-50/30 dark:bg-green-950/40'
      )}
    >
      {/* Sprint Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-950/50 rounded-t-lg">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">{sprint.name}</h3>
            <span className="text-xs text-gray-500 dark:text-slate-400">{dateRange || 'No dates set'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onViewGraph}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded border border-gray-200 dark:border-slate-800',
              'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors'
            )}
          >
            View Graph
          </button>
          <button
            onClick={onStartSprint}
            disabled={isStarting}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded border border-gray-200 dark:border-slate-800',
              'bg-gray-50 dark:bg-slate-950 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isStarting ? 'Starting…' : 'Start sprint'}
          </button>
          {onEditSprint && <SprintActionsMenu sprintName={sprint.name} onEditSprint={onEditSprint} />}
        </div>
      </div>

      {/* Kanban Columns */}
      {stories.length === 0 ? (
        <div className={cn('flex flex-col items-center justify-center py-10 text-gray-400 dark:text-slate-500 transition-colors', isOver && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300')}>
          <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <p className="text-sm font-medium">Drop a backlog story here</p>
          <p className="mt-1 text-xs">It will be added to this sprint.</p>
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
                onEditStory={onEditStory}
              />
            ))}
          </div>
        </div>
      )}
    </div>
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
