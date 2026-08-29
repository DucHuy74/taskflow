import { useState, useCallback } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { BacklogList, SprintBoard, SprintBoardEmpty, CreateSprintDialog, UserStoryCardStatic } from '@/components/backlog';
import { getBacklogStories, createUserStory } from '@/services/backlogService';
import { getSprints, createSprint, addStoryToSprint, getSprintStories, startSprint, removeStoryFromSprint } from '@/services/sprintService';
import type { UserStory } from '@/types/userStory';
import type { CreateSprintRequest, Sprint } from '@/types/sprint';

export function BacklogPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  if (!workspaceId) {
    return <Navigate to="/" replace />;
  }

  const queryClient = useQueryClient();
  const [activeStory, setActiveStory] = useState<UserStory | null>(null);
  const [createSprintOpen, setCreateSprintOpen] = useState(false);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Queries
  const { data: backlogStories = [], isLoading: backlogLoading } = useQuery({
    queryKey: ['backlog-stories', workspaceId],
    queryFn: () => getBacklogStories(workspaceId),
  });

  const { data: sprints = [], isLoading: sprintsLoading } = useQuery({
    queryKey: ['sprints', workspaceId],
    queryFn: () => getSprints(workspaceId),
  });

  // Sprint stories query - fetch for each sprint
  const { data: sprintStoriesMap = {} } = useQuery({
    queryKey: ['sprint-stories', sprints.map((s) => s.id).join(',')],
    queryFn: async () => {
      const map: Record<string, UserStory[]> = {};
      await Promise.all(
        sprints.map(async (sprint) => {
          map[sprint.id] = await getSprintStories(sprint.id);
        })
      );
      return map;
    },
    enabled: sprints.length > 0,
  });

  // Mutations
  const createStoryMutation = useMutation({
    mutationFn: (text: string) => createUserStory(workspaceId, { storyText: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-stories', workspaceId] });
    },
  });

  const createSprintMutation = useMutation({
    mutationFn: (data: CreateSprintRequest) => createSprint(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', workspaceId] });
    },
  });

  const addToSprintMutation = useMutation({
    mutationFn: ({ sprintId, storyId }: { sprintId: string; storyId: string }) =>
      addStoryToSprint(sprintId, storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-stories', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['sprint-stories'] });
    },
  });

  const startSprintMutation = useMutation({
    mutationFn: (sprintId: string) => startSprint(sprintId),
    onSuccess: (_data, sprintId) => {
      // Navigate to sprint graph after starting
      navigate(`/workspace/${workspaceId}/sprint/${sprintId}/graph`);
    },
  });

  // Handlers
  const handleCreateStory = useCallback(
    async (text: string) => {
      await createStoryMutation.mutateAsync(text);
    },
    [createStoryMutation]
  );

  const handleCreateSprint = useCallback(
    async (data: CreateSprintRequest) => {
      await createSprintMutation.mutateAsync(data);
    },
    [createSprintMutation]
  );

  const handleStartSprint = useCallback((sprintId: string) => {
    startSprintMutation.mutate(sprintId);
  }, [startSprintMutation]);

  const handleViewSprintGraph = useCallback((sprint: Sprint) => {
    navigate(`/workspace/${workspaceId}/sprint/${sprint.id}/graph`);
  }, [navigate, workspaceId]);

  const handleMoveStoryToSprint = useCallback(
    async (sprintId: string, storyId: string) => {
      await addToSprintMutation.mutateAsync({ sprintId, storyId });
    },
    [addToSprintMutation]
  );

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

      if (overData?.type === 'backlog') {
        if (story.sprintId) {
          await removeStoryFromSprint(storyId);
          queryClient.invalidateQueries({ queryKey: ['backlog-stories', workspaceId] });
          queryClient.invalidateQueries({ queryKey: ['sprint-stories'] });
        }
        return;
      }

      // Check if dropped on a sprint or sprint column
      if (overData?.type === 'sprint' || overData?.type === 'sprint-column') {
        const targetSprintId = overData?.type === 'sprint'
          ? overData.sprint.id
          : overData.sprintId;

        // Don't add if already in this sprint
        if (story.sprintId !== targetSprintId) {
          await handleMoveStoryToSprint(targetSprintId, storyId);
        }
      }
    },
    [handleMoveStoryToSprint, queryClient, workspaceId]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gray-50">
        {/* Search Bar */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search backlog"
              className={cn(
                'w-full h-10 pl-10 pr-4 text-sm border border-gray-200 rounded',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'placeholder:text-gray-400'
              )}
            />
          </div>

          {/* Filter Button */}
          <button
            className={cn(
              'h-10 px-4 flex items-center gap-2 text-sm font-medium rounded border border-gray-200',
              'bg-white text-gray-700 hover:bg-gray-50 transition-colors'
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filter
          </button>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
            U
          </div>
        </div>

        {/* Sprints Section */}
        {!sprintsLoading && sprints.length > 0 && (
          <div className="space-y-6 mb-6">
            {sprints.map((sprint) => (
              <SprintBoard
                key={sprint.id}
                sprint={sprint}
                stories={sprintStoriesMap[sprint.id] || []}
                isLoading={sprintsLoading}
                onStartSprint={() => handleStartSprint(sprint.id)}
                onViewGraph={() => handleViewSprintGraph(sprint)}
              />
            ))}
          </div>
        )}

        {/* Empty Sprint State */}
        {sprintsLoading === false && sprints.length === 0 && (
          <div className="mb-6">
            <SprintBoardEmpty />
          </div>
        )}

        {/* Backlog Section */}
        <BacklogList
          stories={backlogStories}
          isLoading={backlogLoading}
          onCreateStory={handleCreateStory}
          onStartSprint={() => setCreateSprintOpen(true)}
        />

        {/* Create Sprint Dialog */}
        <CreateSprintDialog
          open={createSprintOpen}
          onOpenChange={setCreateSprintOpen}
          onCreateSprint={handleCreateSprint}
        />

        {/* Drag Overlay */}
        <DragOverlay>
          {activeStory ? (
            <div className="w-[400px]">
              <UserStoryCardStatic story={activeStory} />
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
