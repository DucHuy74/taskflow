import { useState, useCallback, useMemo } from 'react';
import { useParams, Navigate, useNavigate, NavLink } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BacklogList, SprintBoard, SprintBoardEmpty, CreateSprintDialog, UserStoryCardStatic } from '@/components/backlog';
import { getBacklogStories, createUserStories } from '@/services/backlogService';
import { sprintService } from '@/services/sprintService';
import { workspaceService } from '@/services/workspaceService';
import { useToastMessage } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { GitBranch, Layers3, Search, Sparkles } from 'lucide-react';
import type { UserStory } from '@/types/userStory';
import type { CreateSprintRequest, Sprint } from '@/types/sprint';

export function BacklogPage() {
  const { workspaceId: workspaceIdParam } = useParams<{ workspaceId: string }>();
  const workspaceId = workspaceIdParam || '';
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const showToast = useToastMessage();
  const [activeStory, setActiveStory] = useState<UserStory | null>(null);
  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const collisionDetectionStrategy = useCallback<CollisionDetection>((args) => {
    const pointerCollisions = pointerWithin(args);
    const validPointerTargets = pointerCollisions.filter((collision) => {
      const type = args.droppableContainers.find((container) => container.id === collision.id)?.data.current?.type;
      return type === 'sprint-column' || type === 'sprint' || type === 'backlog';
    });
    if (validPointerTargets.length > 0) return validPointerTargets;

    const intersections = rectIntersection(args);
    const validIntersections = intersections.filter((collision) => {
      const type = args.droppableContainers.find((container) => container.id === collision.id)?.data.current?.type;
      return type === 'sprint-column' || type === 'sprint' || type === 'backlog';
    });
    return validIntersections.length > 0 ? validIntersections : closestCenter(args);
  }, []);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Queries
  const { data: backlogStories = [], isLoading: backlogLoading } = useQuery({
    queryKey: ['backlog-stories', workspaceId],
    queryFn: () => getBacklogStories(workspaceId),
    refetchInterval: (query) => query.state.data?.some((story) => story.analysisStatus === 'QUEUED' || story.analysisStatus === 'PROCESSING') ? 5000 : false,
  });

  const { data: workspace } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => workspaceService.getWorkspace(workspaceId),
  });

  const filteredBacklogStories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return query ? backlogStories.filter((story) => story.storyText.toLowerCase().includes(query)) : backlogStories;
  }, [backlogStories, searchQuery]);

  const { data: sprints = [], isLoading: sprintsLoading } = useQuery({
    queryKey: ['sprints', workspaceId],
    queryFn: () => sprintService.getSprints(workspaceId),
  });

  // Sprint stories query - fetch for each sprint
  const { data: sprintStoriesMap = {} } = useQuery({
    queryKey: ['sprint-stories', sprints.map((s) => s.id).join(',')],
    queryFn: async () => {
      const map: Record<string, UserStory[]> = {};
      await Promise.all(
        sprints.map(async (sprint) => {
          map[sprint.id] = await sprintService.getSprintStories(sprint.id);
        })
      );
      return map;
    },
    enabled: sprints.length > 0,
  });

  // Mutations
  const createStoryMutation = useMutation({
    mutationFn: (texts: string[]) => createUserStories(workspaceId, texts.map((storyText) => ({ storyText }))),
    onSuccess: (createdStories) => {
      queryClient.invalidateQueries({ queryKey: ['backlog-stories', workspaceId] });
      showToast(`${createdStories.length} ${createdStories.length === 1 ? 'story' : 'stories'} saved and queued for analysis.`, 'success', 'Backlog updated');
    },
  });

  const createSprintMutation = useMutation({
    mutationFn: (data: CreateSprintRequest) => sprintService.createSprint(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', workspaceId] });
    },
  });

  const addToSprintMutation = useMutation({
    mutationFn: async ({ sprintId, storyId }: { sprintId: string; storyId: string; story: UserStory }) => {
      const success = await sprintService.addStoryToSprint(sprintId, storyId);
      if (!success) throw new Error('Unable to add story to sprint');
    },
    onMutate: async ({ sprintId, story }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['backlog-stories', workspaceId] }),
        queryClient.cancelQueries({ queryKey: ['sprint-stories'] }),
      ]);
      const previousBacklog = queryClient.getQueryData<UserStory[]>(['backlog-stories', workspaceId]);
      const previousSprintMaps = queryClient.getQueriesData<Record<string, UserStory[]>>({ queryKey: ['sprint-stories'] });

      queryClient.setQueryData<UserStory[]>(['backlog-stories', workspaceId], (current = []) => current.filter((item) => item.id !== story.id));
      queryClient.setQueriesData<Record<string, UserStory[]>>({ queryKey: ['sprint-stories'] }, (current = {}) => ({
        ...current,
        [sprintId]: [...(current[sprintId] || []).filter((item) => item.id !== story.id), { ...story, sprintId }],
      }));
      return { previousBacklog, previousSprintMaps };
    },
    onSuccess: (_data, { sprintId }) => {
      const sprintName = sprints.find((sprint) => sprint.id === sprintId)?.name || 'sprint';
      showToast(`Story moved to ${sprintName}.`, 'success', 'Sprint updated');
    },
    onError: (_error, _variables, context) => {
      if (context?.previousBacklog) queryClient.setQueryData(['backlog-stories', workspaceId], context.previousBacklog);
      context?.previousSprintMaps.forEach(([key, value]) => queryClient.setQueryData(key, value));
      showToast('The story could not be moved. It has been restored to the backlog.', 'error', 'Move failed');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-stories', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['sprint-stories'] });
    },
  });

  const startSprintMutation = useMutation({
    mutationFn: (sprintId: string) => sprintService.startSprint(sprintId),
    onSuccess: (_data, sprintId) => {
      // Navigate to sprint graph after starting
      navigate(`/workspace/${workspaceId}/sprint/${sprintId}/graph`);
    },
  });

  // Handlers
  const handleCreateStory = useCallback(
    async (texts: string[]) => {
      await createStoryMutation.mutateAsync(texts);
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
    async (sprintId: string, story: UserStory) => {
      await addToSprintMutation.mutateAsync({ sprintId, storyId: story.id, story });
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
          await sprintService.removeStoryFromSprint(storyId);
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
          await handleMoveStoryToSprint(targetSprintId, story);
        }
      }
    },
    [handleMoveStoryToSprint, queryClient, workspaceId]
  );

  if (!workspaceIdParam) {
    return <Navigate to="/" replace />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-full bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><nav className="mb-1 text-xs font-medium text-slate-500" aria-label="Breadcrumb">Workspaces / {workspace?.name || 'Workspace'}</nav><h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Backlog</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Plan stories, prepare sprints, and turn analyzed requirements into a connected map.</p></div>
            <Button onClick={() => navigate(`/workspace/${workspaceId}/graph`)}><GitBranch className="h-4 w-4" aria-hidden="true" /> Open story map</Button>
          </div>

          <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <NavLink to={`/workspace/${workspaceId}/backlog`} className="flex min-h-11 items-center gap-2 border-b-2 border-indigo-600 text-sm font-semibold text-indigo-700 no-underline dark:text-indigo-300"><Layers3 className="h-4 w-4" aria-hidden="true" /> Backlog</NavLink>
              <NavLink to={`/workspace/${workspaceId}/graph`} className="flex min-h-11 items-center gap-2 border-b-2 border-transparent text-sm font-medium text-slate-600 no-underline hover:border-slate-300 dark:text-slate-300"><GitBranch className="h-4 w-4" aria-hidden="true" /> Story map</NavLink>
            </div>
            <div className="relative mb-3 w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><label htmlFor="backlog-search" className="sr-only">Search backlog</label><input id="backlog-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search backlog" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></div>
          </div>

          <div className="mb-5 flex items-start gap-3 rounded-lg border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-200"><Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>New stories are analyzed by a background worker. When the batch is ready, rebuild the story map to refresh workspace relationships.</p></div>

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
          stories={filteredBacklogStories}
          isLoading={backlogLoading}
          isCreating={createStoryMutation.isPending}
          onCreateStories={handleCreateStory}
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
      </div>
    </DndContext>
  );
}
