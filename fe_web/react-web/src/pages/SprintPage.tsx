import { useState, useCallback } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { CompleteSprintDialog, EditSprintDialog, SprintActionsMenu, UserStoryCard, UserStoryCardStatic } from '@/components/backlog';
import { useToastMessage } from '@/components/ui/toast';
import { formatSprintDateRange } from '@/lib/sprintDates';
import { findActiveSprint, SPRINT_STATUS_LABELS } from '@/lib/sprintLifecycle';
import { invalidateSprintData, useSprintLifecycle, useStoryStatusMutation } from '@/hooks/useSprintMutations';
import { sprintService } from '@/services/sprintService';
import { getBacklogStories } from '@/services/backlogService';
import type { UserStory, UserStoryStatus } from '@/types/userStory';

const columns = [
  { id: 'ToDo', title: 'To Do', color: 'bg-gray-100 dark:bg-slate-800' },
  { id: 'InProgress', title: 'In Progress', color: 'bg-blue-100 dark:bg-blue-950/60' },
  { id: 'Done', title: 'Done', color: 'bg-green-100 dark:bg-green-950/60' },
] as const;

type ColumnId = (typeof columns)[number]['id'];

export function SprintPage() {
  const { workspaceId, sprintId } = useParams<{ workspaceId: string; sprintId: string }>();
  const queryClient = useQueryClient();
  const showToast = useToastMessage();

  // Fetch all sprints to find the current one
  const { data: sprints = [] } = useQuery({
    queryKey: ['sprints', workspaceId],
    queryFn: () => sprintService.getSprints(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const sprint = sprintId ? sprints.find((s) => s.id === sprintId) : sprints[0];
  const [activeStory, setActiveStory] = useState<UserStory | null>(null);
  const [isEditingSprint, setIsEditingSprint] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Queries
  const { data: sprintStories = [], isLoading: storiesLoading } = useQuery({
    queryKey: ['sprint-stories', sprint?.id],
    queryFn: () => sprintService.getSprintStories(sprint!.id),
    enabled: !!sprint?.id,
  });

  const { data: backlogStories = [] } = useQuery({
    queryKey: ['backlog-stories', workspaceId],
    queryFn: () => getBacklogStories(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  // Mutations (status changes are optimistic with rollback; see useStoryStatusMutation)
  const updateStatusMutation = useStoryStatusMutation(workspaceId || '');
  const { startSprint: startSprintMutation, completeSprint: completeSprintMutation } = useSprintLifecycle(workspaceId || '', sprints);
  const activeSprint = findActiveSprint(sprints, sprint?.id);
  const startBlockedReason = sprint?.status === 'ToDo' && activeSprint
    ? `“${activeSprint.name}” is in progress. Complete it before starting this sprint.`
    : undefined;

  const addToSprintMutation = useMutation({
    mutationFn: async ({ sprintId: targetSprintId, storyId }: { sprintId: string; storyId: string }) => {
      if (!await sprintService.addStoryToSprint(targetSprintId, storyId)) throw new Error('Unable to add story to sprint');
    },
    onSuccess: () => showToast(`Story added to ${sprint?.name || 'the sprint'}.`, 'success', 'Sprint updated'),
    onError: () => showToast('The story could not be added to the sprint. Please try again.', 'error', 'Move failed'),
    onSettled: () => invalidateSprintData(queryClient, workspaceId || ''),
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
    (event: DragEndEvent) => {
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

      if (!targetColumn || !sprint) return;
      if (sprint.status === 'Done') {
        showToast('Completed sprints are read-only.', 'default', 'Sprint completed');
        return;
      }

      // A backlog story dropped onto the board joins the sprint.
      if (!sprintStories.some((item) => item.id === storyId)) {
        addToSprintMutation.mutate({ sprintId: sprint.id, storyId });
        return;
      }

      if (targetColumn === story.status) return;
      if (sprint.status !== 'InProgress') {
        showToast('Start the sprint to move stories between columns.', 'default', 'Sprint not started');
        return;
      }
      updateStatusMutation.mutate({ story, sprintId: sprint.id, status: targetColumn });
    },
    [addToSprintMutation, showToast, sprint, sprintStories, updateStatusMutation]
  );

  const handleStartSprint = useCallback(() => {
    if (!sprint || startBlockedReason) return;
    startSprintMutation.mutate(sprint.id);
  }, [sprint, startBlockedReason, startSprintMutation]);

  const handleConfirmComplete = useCallback(() => {
    if (!sprint) return;
    completeSprintMutation.mutate(
      { sprintId: sprint.id, stories: sprintStories },
      { onSettled: () => setIsCompleteDialogOpen(false) }
    );
  }, [completeSprintMutation, sprint, sprintStories]);

  const handleChangeStatus = useCallback((story: UserStory, status: UserStoryStatus) => {
    if (sprint) updateStatusMutation.mutate({ story, sprintId: sprint.id, status });
  }, [sprint, updateStatusMutation]);

  const dateRange = formatSprintDateRange(sprint?.startDate, sprint?.endDate);

  if (!workspaceId) {
    return <Navigate to="/" replace />;
  }

  // If no sprint available, show loading or empty state
  if (!sprint) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-slate-400 mb-4">No sprint selected or found.</p>
          <a href={`/workspace/${workspaceId}/backlog`} className="text-blue-600 dark:text-blue-400 hover:underline">
            Back to Backlog
          </a>
        </div>
      </div>
    );
  }

  const isDone = sprint.status === 'Done';

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gray-100 dark:bg-slate-950">
        {/* Sprint Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">{sprint.name}</h1>
                {dateRange && (
                  <span className="text-sm text-gray-500 dark:text-slate-400 ml-2">{dateRange}</span>
                )}
              </div>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium uppercase',
                  sprint.status === 'InProgress'
                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                    : sprint.status === 'Done'
                    ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                )}
              >
                <span className="sr-only">Status: </span>{SPRINT_STATUS_LABELS[sprint.status]}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Story count */}
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
                <span>{sprintStories.length} issues</span>
                <span>
                  {storiesByStatus.Done.length}/{sprintStories.length} completed
                </span>
              </div>

              {sprint.status === 'ToDo' && (
                <button
                  type="button"
                  onClick={handleStartSprint}
                  disabled={startSprintMutation.isPending}
                  aria-disabled={startBlockedReason ? true : undefined}
                  aria-describedby={startBlockedReason ? 'sprint-start-blocked' : undefined}
                  title={startBlockedReason}
                  className={cn(
                    'min-h-11 px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
                    'disabled:opacity-50',
                    startBlockedReason ? 'cursor-not-allowed opacity-50' : 'hover:bg-blue-700'
                  )}
                >
                  {startSprintMutation.isPending ? 'Starting…' : 'Start Sprint'}
                </button>
              )}

              {sprint.status === 'InProgress' && (
                <button
                  type="button"
                  onClick={() => setIsCompleteDialogOpen(true)}
                  disabled={completeSprintMutation.isPending}
                  className={cn(
                    'min-h-11 px-4 py-2 text-sm font-medium rounded bg-emerald-600 text-white transition-colors',
                    'hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-50',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900'
                  )}
                >
                  {completeSprintMutation.isPending ? 'Completing…' : 'Complete sprint'}
                </button>
              )}

              {/* Actions menu */}
              <SprintActionsMenu
                sprintName={sprint.name}
                onEditSprint={() => setIsEditingSprint(true)}
                onCompleteSprint={sprint.status === 'InProgress' ? () => setIsCompleteDialogOpen(true) : undefined}
              />
            </div>
          </div>
          {startBlockedReason && (
            <p id="sprint-start-blocked" className="mt-2 text-right text-xs text-amber-700 dark:text-amber-300">{startBlockedReason}</p>
          )}
          {sprint.status === 'ToDo' && !startBlockedReason && sprintStories.length > 0 && (
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">Start the sprint to move stories between columns.</p>
          )}
          {isDone && (
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">This sprint is completed and read-only. Unfinished stories were returned to the backlog.</p>
          )}
        </div>

        {/* Kanban Board */}
        <div className="p-6">
          {storiesLoading ? (
            <div className="flex gap-4">
              {columns.map((col) => (
                <div
                  key={col.id}
                  className="flex-1 min-w-[280px] max-w-[360px] bg-gray-200/50 dark:bg-slate-900 rounded-lg p-4 animate-pulse"
                >
                  <div className="h-6 w-20 bg-gray-300 dark:bg-slate-800 rounded mb-4" />
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-24 bg-gray-300 dark:bg-slate-800 rounded" />
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
                  readOnly={isDone}
                  onStatusChange={sprint.status === 'InProgress' ? handleChangeStatus : undefined}
                />
              ))}

              {/* Backlog Drop Zone (completed sprints are read-only) */}
              {!isDone && (
                <div className="flex-shrink-0 w-64">
                  <div className="bg-gray-200/50 dark:bg-slate-900/60 dark:ring-1 dark:ring-slate-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <svg className="w-4 h-4 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Backlog</span>
                      <span className="text-xs text-gray-400 dark:text-slate-500">({backlogStories.length})</span>
                    </div>
                    <div className="space-y-2 *:rounded-md dark:*:ring-1 dark:*:ring-slate-800">
                      {backlogStories.slice(0, 5).map((story) => (
                        <UserStoryCard key={story.id} story={story} draggable />
                      ))}
                      {backlogStories.length > 5 && (
                        <div className="text-center text-xs text-gray-400 dark:text-slate-500 py-2">
                          +{backlogStories.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <EditSprintDialog
          key={isEditingSprint ? sprint.id : 'closed'}
          sprint={sprint}
          workspaceId={workspaceId}
          open={isEditingSprint}
          onOpenChange={setIsEditingSprint}
        />

        <CompleteSprintDialog
          sprint={sprint}
          stories={sprintStories}
          open={isCompleteDialogOpen}
          onOpenChange={(open) => { if (!completeSprintMutation.isPending) setIsCompleteDialogOpen(open); }}
          onConfirm={handleConfirmComplete}
          isCompleting={completeSprintMutation.isPending}
        />

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
  readOnly,
  onStatusChange,
}: {
  column: (typeof columns)[number];
  stories: UserStory[];
  readOnly: boolean;
  onStatusChange?: (story: UserStory, status: UserStoryStatus) => void;
}) {
  // Makes empty columns valid drop targets (previously only dropping on another card worked).
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { type: 'column', columnId: column.id },
    disabled: readOnly,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn('flex-1 min-w-[280px] max-w-[360px] rounded-lg transition-colors', isOver && 'bg-blue-50 ring-2 ring-blue-200 dark:bg-blue-950/40 dark:ring-blue-800')}
    >
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
          <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{column.title}</span>
        </div>
        <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">{stories.length}</span>
      </div>

      {/* Column Content */}
      <SortableContext items={stories.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 min-h-[200px]">
          {stories.map((story) => (
            <UserStoryCard
              key={story.id}
              story={story}
              draggable={!readOnly}
              onStatusChange={onStatusChange}
            />
          ))}

          {stories.length === 0 && (
            <div className="h-24 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm">
              {readOnly ? 'No stories' : 'Drop stories here'}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
