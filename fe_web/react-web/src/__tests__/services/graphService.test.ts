import { beforeEach, describe, expect, it, vi } from 'vitest';
import { graphService } from '@/services/graphService';

vi.mock('@/services/api', () => ({ api: { post: vi.fn() } }));

describe('graphService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requests the BATCH graph with the sprintId variable', async () => {
    const { api } = await import('@/services/api');
    vi.mocked(api.post).mockResolvedValue({ data: { data: { workspaceGraph: { nodes: [], edges: [] } } } });

    await graphService.getSprintGraph('workspace-1', 'sprint-1');

    expect(api.post).toHaveBeenCalledWith('/graphql', expect.objectContaining({
      query: expect.stringContaining('source: "BATCH"'),
      variables: { workspaceId: 'workspace-1', sprintId: 'sprint-1', backlogId: null },
    }), expect.any(Object));
  });
});
