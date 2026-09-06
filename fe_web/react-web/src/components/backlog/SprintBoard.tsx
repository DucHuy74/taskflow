import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { UserStoryCard } from './UserStoryCard';
import type { Sprint } from '@/types/sprint';
import type { UserStory } from '@/types/userStory';

interface SprintBoardProps {
  sprint: Sprint;
  stories: UserStory[];
  isLoading?: boolean;
  onStartSprint: () => void;
  onViewGraph?: () => void;
}

const columns = [
  { id: 'ToDo', title: 'To Do', color: 'bg-gray-100' },
  { id: 'InProgress', title: 'In Progress', color: 'bg-blue-100' },
  { id: 'Done', title: 'Done', color: 'bg-green-100' },
] as const;

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  } catch {
    return '';
  }
}

function KanbanColumn({
  column,
  stories,
  sprintId,
}: {
  column: (typeof columns)[number];
  stories: UserStory[];
  sprintId: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `sprint-${column.id}`,
    data: { type: 'sprint-column', status: column.id, sprintId },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 min-w-[250px] max-w-[320px] bg-gray-50/80 rounded-lg p-2 transition-colors',
        isOver && 'bg-blue-50 ring-2 ring-blue-200'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', column.id === 'ToDo' ? 'bg-gray-400' : column.id === 'InProgress' ? 'bg-blue-500' : 'bg-green-500')} />
          <span className="text-sm font-medium text-gray-700">{column.title}</span>
        </div>
        <span className="text-xs text-gray-400">{stories.length}</span>
      </div>

      {/* Column Content */}
      <SortableContext items={stories.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[80px]">
          {stories.map((story) => (
            <UserStoryCard
              key={story.id}
              story={{ ...story, status: column.id }}
              draggable
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function SprintBoard({ sprint, stories, isLoading, onStartSprint, onViewGraph }: SprintBoardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `sprint-${sprint.id}`,
    data: { type: 'sprint', sprint },
  });

  const storiesByStatus = {
    ToDo: stories.filter((s) => s.status === 'ToDo'),
    InProgress: stories.filter((s) => s.status === 'InProgress'),
    Done: stories.filter((s) => s.status === 'Done'),
  };

  const dateRange =
    sprint.startDate && sprint.endDate
      ? `${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)}`
      : '';

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="p-4">
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-1 min-w-[250px] h-48 bg-gray-100 rounded animate-pulse" />
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
        'bg-white rounded-lg border border-gray-100 shadow-sm transition-all',
        isOver && 'border-2 border-dashed border-green-400 bg-green-50/30'
      )}
    >
      {/* Sprint Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-lg">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <div>
            <h3 className="font-semibold text-gray-900">{sprint.name}</h3>
            {dateRange && <span className="text-xs text-gray-500">{dateRange}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onViewGraph}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded border border-gray-200',
              'bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors'
            )}
          >
            View Graph
          </button>
          <button
            onClick={onStartSprint}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded border border-gray-200',
              'bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            Start sprint
          </button>
          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
            </svg>
          </button>
        </div>
      </div>

      {/* Kanban Columns */}
      {stories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
          <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <p className="text-sm italic">Plan a sprint by dragging work items into it.</p>
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
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Plan your sprint</h3>
        <p className="text-sm text-gray-500 text-center max-w-sm">
          Drag work items from the Backlog section or create new ones.
        </p>
      </div>
    </div>
  );
}
