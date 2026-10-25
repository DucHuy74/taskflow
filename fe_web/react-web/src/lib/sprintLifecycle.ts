import { ERROR_CODES, getApiErrorCode, getApiErrorMessage, isForbidden } from '@/services/apiError';
import type { Sprint, SprintStatus } from '@/types/sprint';
import type { UserStory, UserStoryStatus } from '@/types/userStory';

export const STORY_STATUS_OPTIONS: ReadonlyArray<{ value: UserStoryStatus; label: string }> = [
  { value: 'ToDo', label: 'To do' },
  { value: 'InProgress', label: 'In progress' },
  { value: 'Done', label: 'Done' },
];

export function storyStatusLabel(status: UserStoryStatus): string {
  return STORY_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export const SPRINT_STATUS_LABELS: Record<SprintStatus, string> = {
  ToDo: 'Not started',
  InProgress: 'In progress',
  Done: 'Completed',
};

/** Another sprint of the workspace that is InProgress (the backend allows only one at a time). */
export function findActiveSprint(sprints: Sprint[], excludeSprintId?: string): Sprint | undefined {
  return sprints.find((sprint) => sprint.status === 'InProgress' && sprint.id !== excludeSprintId);
}

/** How many stories go back to the backlog (not Done) vs. stay in the sprint (Done) on completion. */
export function summarizeCompletion(stories: UserStory[]): { unfinished: number; done: number } {
  const done = stories.filter((story) => story.status === 'Done').length;
  return { unfinished: stories.length - done, done };
}

export interface SprintErrorInfo {
  message: string;
  /** The local sprint list is stale; refetch it. */
  refetch: boolean;
}

export function describeStartSprintError(error: unknown, sprints: Sprint[], sprintId: string): SprintErrorInfo {
  const code = getApiErrorCode(error);
  if (code === ERROR_CODES.SPRINT_ALREADY_ACTIVE) {
    const active = findActiveSprint(sprints, sprintId);
    return {
      message: active
        ? `Another sprint (“${active.name}”) is already in progress. Complete it before starting this one.`
        : 'Another sprint is already in progress. Complete it before starting this one.',
      refetch: true,
    };
  }
  if (code === ERROR_CODES.SPRINT_INVALID_STATE) {
    return { message: 'This sprint has already been started or completed.', refetch: true };
  }
  if (code === ERROR_CODES.SPRINT_NOT_FOUND) return { message: 'This sprint no longer exists.', refetch: true };
  if (isForbidden(error)) return { message: 'You don’t have permission to start sprints in this workspace.', refetch: false };
  return { message: getApiErrorMessage(error, 'The sprint could not be started. Please try again.'), refetch: false };
}

export function describeCompleteSprintError(error: unknown): SprintErrorInfo {
  const code = getApiErrorCode(error);
  if (code === ERROR_CODES.SPRINT_INVALID_STATE) {
    return { message: 'This sprint isn’t in progress, so it can’t be completed.', refetch: true };
  }
  if (code === ERROR_CODES.SPRINT_NOT_FOUND) return { message: 'This sprint no longer exists.', refetch: true };
  if (isForbidden(error)) return { message: 'You don’t have permission to complete sprints in this workspace.', refetch: false };
  return { message: getApiErrorMessage(error, 'The sprint could not be completed. Please try again.'), refetch: false };
}

export function describeStoryStatusError(error: unknown): SprintErrorInfo {
  const code = getApiErrorCode(error);
  if (code === ERROR_CODES.SPRINT_NOT_ACTIVE) {
    return { message: 'This sprint isn’t in progress. Start the sprint to change story status.', refetch: true };
  }
  if (code === ERROR_CODES.USER_STORY_NOT_IN_SPRINT) {
    return { message: 'This story is no longer in a sprint. The board has been refreshed.', refetch: true };
  }
  if (code === ERROR_CODES.INVALID_USER_STORY_STATUS) return { message: 'That status isn’t valid for this story.', refetch: false };
  if (isForbidden(error)) return { message: 'You don’t have permission to change story status.', refetch: false };
  return { message: getApiErrorMessage(error, 'The story status could not be updated. It has been restored.'), refetch: false };
}
