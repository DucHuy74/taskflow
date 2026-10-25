import { useMutation, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { useToastMessage } from '@/components/ui/toast';
import { sprintService } from '@/services/sprintService';
import { updateStoryStatus } from '@/services/backlogService';
import {
  describeCompleteSprintError,
  describeStartSprintError,
  describeStoryStatusError,
  storyStatusLabel,
  summarizeCompletion,
} from '@/lib/sprintLifecycle';
import type { Sprint } from '@/types/sprint';
import type { UserStory, UserStoryStatus } from '@/types/userStory';

/** Everything that changes when a sprint starts/completes or a story changes column. */
export function invalidateSprintData(queryClient: QueryClient, workspaceId: string) {
  void queryClient.invalidateQueries({ queryKey: ['sprints', workspaceId] });
  void queryClient.invalidateQueries({ queryKey: ['sprint-stories-map', workspaceId] });
  void queryClient.invalidateQueries({ queryKey: ['sprint-stories'] });
  void queryClient.invalidateQueries({ queryKey: ['backlog-stories', workspaceId] });
  // Prefix of ['sprint-graph', workspaceId, sprintId].
  void queryClient.invalidateQueries({ queryKey: ['sprint-graph', workspaceId] });
}

function truncate(text: string, max = 48) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Start / complete mutations with backend error-code mapping, toasts and cache invalidation. */
export function useSprintLifecycle(workspaceId: string, sprints: Sprint[]) {
  const queryClient = useQueryClient();
  const showToast = useToastMessage();
  const nameOf = (sprintId: string) => sprints.find((sprint) => sprint.id === sprintId)?.name || 'The sprint';

  const startSprint = useMutation({
    mutationFn: (sprintId: string) => sprintService.startSprint(sprintId),
    onSuccess: (_data, sprintId) => {
      showToast(`${nameOf(sprintId)} is now in progress. Move stories between columns as work progresses.`, 'success', 'Sprint started');
    },
    onError: (error, sprintId) => {
      const info = describeStartSprintError(error, sprints, sprintId);
      showToast(info.message, 'error', 'Start failed');
    },
    onSettled: () => invalidateSprintData(queryClient, workspaceId),
  });

  const completeSprint = useMutation({
    mutationFn: ({ sprintId }: { sprintId: string; stories: UserStory[] }) => sprintService.completeSprint(sprintId),
    onSuccess: (_data, { sprintId, stories }) => {
      const { unfinished } = summarizeCompletion(stories);
      const returned = unfinished === 0
        ? 'All stories were done.'
        : `${unfinished} unfinished ${unfinished === 1 ? 'story' : 'stories'} returned to the backlog.`;
      showToast(`${nameOf(sprintId)} was completed. ${returned}`, 'success', 'Sprint completed');
    },
    onError: (error) => {
      const info = describeCompleteSprintError(error);
      showToast(info.message, 'error', 'Complete failed');
    },
    onSettled: () => invalidateSprintData(queryClient, workspaceId),
  });

  return { startSprint, completeSprint };
}

interface StoryStatusVariables {
  story: UserStory;
  sprintId: string;
  status: UserStoryStatus;
}

/**
 * Optimistically moves a story to another status column of an InProgress sprint, updating both the
 * backlog page's ['sprint-stories-map', workspaceId, …] cache and the sprint page's
 * ['sprint-stories', sprintId] cache; rolls back and explains the error on failure.
 */
export function useStoryStatusMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  const showToast = useToastMessage();

  return useMutation({
    mutationFn: ({ story, status }: StoryStatusVariables) => updateStoryStatus(story.id, status),
    onMutate: async ({ story, sprintId, status }) => {
      const mapKey: QueryKey = ['sprint-stories-map', workspaceId];
      const listKey: QueryKey = ['sprint-stories', sprintId];
      await Promise.all([
        queryClient.cancelQueries({ queryKey: mapKey }),
        queryClient.cancelQueries({ queryKey: listKey }),
      ]);
      const previousMaps = queryClient.getQueriesData<Record<string, UserStory[]>>({ queryKey: mapKey });
      const previousList = queryClient.getQueryData<UserStory[]>(listKey);
      const apply = (items: UserStory[]) => items.map((item) => (item.id === story.id ? { ...item, status } : item));

      queryClient.setQueriesData<Record<string, UserStory[]>>({ queryKey: mapKey }, (current) =>
        current && current[sprintId] ? { ...current, [sprintId]: apply(current[sprintId]) } : current
      );
      if (previousList) queryClient.setQueryData<UserStory[]>(listKey, apply(previousList));
      return { previousMaps, previousList, listKey };
    },
    onSuccess: (_data, { story, status }) => {
      showToast(`“${truncate(story.storyText)}” moved to ${storyStatusLabel(status)}.`, 'success', 'Status updated');
    },
    onError: (error, _variables, context) => {
      context?.previousMaps.forEach(([key, value]) => queryClient.setQueryData(key, value));
      if (context?.previousList) queryClient.setQueryData(context.listKey, context.previousList);
      const info = describeStoryStatusError(error);
      showToast(info.message, 'error', 'Status not changed');
      if (info.refetch) void queryClient.invalidateQueries({ queryKey: ['sprints', workspaceId] });
    },
    onSettled: (_data, _error, { sprintId }) => {
      void queryClient.invalidateQueries({ queryKey: ['sprint-stories-map', workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ['sprint-stories', sprintId] });
      void queryClient.invalidateQueries({ queryKey: ['sprint-graph', workspaceId, sprintId] });
    },
  });
}
