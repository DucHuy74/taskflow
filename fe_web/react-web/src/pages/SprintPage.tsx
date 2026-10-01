import { useState, useCallback } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { UserStoryCard, UserStoryCardStatic } from '@/components/backlog';
import { sprintService } from '@/services/sprintService';
import { getBacklogStories } from '@/services/backlogService';
import { updateStoryStatus } from '@/services/backlogService';
import type { UserStory } from '@/types/userStory';

const columns = [
  { id: 'ToDo', title: 'To Do', color: 'bg-gray-100' },
  { id: 'InProgress', title: 'In Progress', color: 'bg-blue-100' },
  { id: 'Done', title: 'Done', color: 'bg-green-100' },
] as const;

type ColumnId = (typeof columns)[number]['id'];

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

export function SprintPage() {
  const { workspaceId, sprintId } = useParams<{ workspaceId: string; sprintId: string }>();

  if (!workspaceId) {
    return <Navigate to="/" replace />;
  }

  const queryClient = useQueryClient();

  // Fetch all sprints to find the current one
  const { data: sprints = [] } = useQuery({
    queryKey: ['sprints', workspaceId],
    queryFn: () => sprintService.getSprints(workspaceId),
  });

  const sprint = sprintId ? sprints.find((s) => s.id === sprintId) : sprints[0];
  const [activeStory, setActiveStory] = useState<UserStory | null>(null);

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Queries
  const { data: sprintStories = [], isLoading: storiesLoading } = useQuery({
    queryKey: ['sprint-stories', sprint?.id],
    queryFn: () => sprintService.getSprintStories(sprint!.id),
    enabled: !!sprint?.id,
  });

  const { data: backlogStories = [] } = useQuery({
    queryKey: ['backlog-stories', workspaceId],
    queryFn: () => getBacklogStories(workspaceId),
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: async ({ storyId, status }: { storyId: string; status: ColumnId }) => {
      // Backend expects: ToDo, InProgress, Done
      return updateStoryStatus(storyId, status);
    },
    onMutate: async ({ storyId, status }) => {
      if (!sprint) return;
      await queryClient.cancelQueries({ queryKey: ['sprint-stories', sprint.id] });
      const previous = queryClient.getQueryData(['sprint-stories', sprint.id]);
      queryClient.setQueryData<UserStory[]>(['sprint-stories', sprint.id], (old) =>
        old?.map((s) => (s.id === storyId ? { ...s, status } : s))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous && sprint) {
        queryClient.setQueryData(['sprint-stories', sprint.id], context.previous);
      }
    },
    onSettled: () => {
      if (sprint) {
        queryClient.invalidateQueries({ queryKey: ['sprint-stories', sprint.id] });
      }
    },
  });

  // Note: addToSprintMutation available for future drag-to-sprint feature
  // const addToSprintMutation = useMutation({ ... });

  const startSprintMutation = useMutation({
    mutationFn: () => sprintService.startSprint(sprint!.id),
  });

  // Group stories by status
  const storiesByStatus = {
    ToDo: sprintStories.filter((s) => s.status === 'ToDo'),
    InProgress: sprintStories.filter((s) => s.status === 'InProgress'),
    Done: sprintStories.filter((s) => s.status === 'Done'),
  };

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'userStory') {
      setActiveStory(active.data.current.story as UserStory);
    }
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveStory(null);

      if (!over) return;

      const activeData = active.data.current;
      const overData = over.data.current;

      if (activeData?.type !== 'userStory') return;

      const storyId = active.id as string;
      const story = activeData.story as UserStory;

      // Determine target column
      let targetColumn: ColumnId | null = null;

      if (overData?.type === 'column') {
        targetColumn = overData.columnId as ColumnId;
      } else if (overData?.type === 'userStory') {
        // Dropped on another story - get that story's column
        const overStory = overData.story as UserStory;
        targetColumn = overStory.status;
      }

      if (targetColumn && targetColumn !== story.status) {
        await updateStatusMutation.mutateAsync({ storyId, status: targetColumn });
      }
    },
    [updateStatusMutation]
  );

  const handleStartSprint = useCallback(async () => {
    await startSprintMutation.mutateAsync();
  }, [startSprintMutation]);

  const dateRange =
    sprint?.startDate && sprint?.endDate
      ? `${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)}`
      : '';

  // If no sprint available, show loading or empty state
  if (!sprint) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No sprint selected or found.</p>
          <a href={`/workspace/${workspaceId}/backlog`} className="text-blue-600 hover:underline">
            Back to Backlog
          </a>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gray-100">
        {/* Sprint Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <h1 className="text-xl font-bold text-gray-900">{sprint.name}</h1>
                {dateRange && (
                  <span className="text-sm text-gray-500 ml-2">{dateRange}</span>
                )}
              </div>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium uppercase',
                  sprint.status === 'InProgress'
                    ? 'bg-blue-100 text-blue-700'
                    : sprint.status === 'Completed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                )}
              >
                {sprint.status === 'InProgress' ? 'Active' : sprint.status}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Story count */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{sprintStories.length} issues</span>
                <span>
                  {storiesByStatus.Done.length}/{sprintStories.length} completed
                </span>
              </div>

              {sprint.status === 'ToDo' && (
                <button
                  onClick={handleStartSprint}
                  disabled={startSprintMutation.isPending}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white',
                    'hover:bg-blue-700 disabled:opacity-50 transition-colors'
                  )}
                >
                  {startSprintMutation.isPending ? 'Starting...' : 'Start Sprint'}
                </button>
              )}

              {/* Actions menu */}
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="p-6">
          {storiesLoading ? (
            <div className="flex gap-4">
              {columns.map((col) => (
                <div
                  key={col.id}
                  className="flex-1 min-w-[280px] max-w-[360px] bg-gray-200/50 rounded-lg p-4 animate-pulse"
                >
                  <div className="h-6 w-20 bg-gray-300 rounded mb-4" />
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-24 bg-gray-300 rounded" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  stories={storiesByStatus[column.id]}
                />
              ))}

              {/* Backlog Drop Zone */}
              <div className="flex-shrink-0 w-64">
                <div className="bg-gray-200/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <span className="text-sm font-medium text-gray-500">Backlog</span>
                    <span className="text-xs text-gray-400">({backlogStories.length})</span>
                  </div>
                  <div className="space-y-2">
                    {backlogStories.slice(0, 5).map((story) => (
                      <UserStoryCard key={story.id} story={story} draggable />
                    ))}
                    {backlogStories.length > 5 && (
                      <div className="text-center text-xs text-gray-400 py-2">
                        +{backlogStories.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeStory ? (
            <div className="w-[320px]">
              <UserStoryCardStatic story={activeStory} />
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

// Kanban Column Component
function KanbanColumn({
  column,
  stories,
}: {
  column: (typeof columns)[number];
  stories: UserStory[];
}) {
  return (
    <div className="flex-1 min-w-[280px] max-w-[360px]">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-3 h-3 rounded-full',
              column.id === 'ToDo'
                ? 'bg-gray-400'
                : column.id === 'InProgress'
                ? 'bg-blue-500'
                : 'bg-green-500'
            )}
          />
          <span className="text-sm font-semibold text-gray-700">{column.title}</span>
        </div>
        <span className="text-xs text-gray-400 font-medium">{stories.length}</span>
      </div>

      {/* Column Content */}
      <SortableContext items={stories.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 min-h-[200px]">
          {stories.map((story) => (
            <UserStoryCard
              key={story.id}
              story={story}
              draggable
            />
          ))}

          {stories.length === 0 && (
            <div className="h-24 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-sm">
              Drop stories here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
