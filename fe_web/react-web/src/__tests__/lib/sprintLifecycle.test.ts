import { describe, expect, it } from 'vitest';
import {
  describeCompleteSprintError,
  describeStartSprintError,
  describeStoryStatusError,
  findActiveSprint,
  summarizeCompletion,
} from '@/lib/sprintLifecycle';
import type { Sprint } from '@/types/sprint';
import type { UserStory } from '@/types/userStory';

const apiError = (code: number, status = 400) => Object.assign(new Error(String(status)), { response: { status, data: { code } } });

const sprints: Sprint[] = [
  { id: 's1', name: 'Sprint 12', status: 'InProgress' },
  { id: 's2', name: 'Sprint 13', status: 'ToDo' },
  { id: 's0', name: 'Sprint 11', status: 'Done' },
];

describe('sprintLifecycle', () => {
  it('finds the in-progress sprint, optionally excluding one', () => {
    expect(findActiveSprint(sprints)?.id).toBe('s1');
    expect(findActiveSprint(sprints, 's1')).toBeUndefined();
  });

  it('counts unfinished vs done stories for completion', () => {
    const stories = [{ status: 'ToDo' }, { status: 'InProgress' }, { status: 'Done' }] as UserStory[];
    expect(summarizeCompletion(stories)).toEqual({ unfinished: 2, done: 1 });
    expect(summarizeCompletion([])).toEqual({ unfinished: 0, done: 0 });
  });

  it('names the active sprint for 1022 and asks for a refetch', () => {
    const info = describeStartSprintError(apiError(1022), sprints, 's2');
    expect(info.message).toBe('Another sprint (“Sprint 12”) is already in progress. Complete it before starting this one.');
    expect(info.refetch).toBe(true);
  });

  it('falls back to a generic 1022 message when the active sprint is unknown', () => {
    expect(describeStartSprintError(apiError(1022), [], 's2').message).toBe(
      'Another sprint is already in progress. Complete it before starting this one.'
    );
  });

  it('maps 1021 on start and complete', () => {
    expect(describeStartSprintError(apiError(1021), sprints, 's1')).toEqual({ message: 'This sprint has already been started or completed.', refetch: true });
    expect(describeCompleteSprintError(apiError(1021)).refetch).toBe(true);
  });

  it('maps forbidden and unknown errors', () => {
    expect(describeStartSprintError(apiError(1014, 403), sprints, 's2').message).toMatch(/permission/);
    expect(describeStartSprintError(new Error('Network Error'), sprints, 's2').message).toBe('Network Error');
  });

  it('maps story status errors', () => {
    expect(describeStoryStatusError(apiError(1027))).toEqual({ message: 'This sprint isn’t in progress. Start the sprint to change story status.', refetch: true });
    expect(describeStoryStatusError(apiError(1026)).refetch).toBe(true);
    expect(describeStoryStatusError(apiError(1028)).message).toMatch(/isn’t valid/);
    expect(describeStoryStatusError(apiError(1014, 403)).message).toMatch(/permission/);
  });
});
