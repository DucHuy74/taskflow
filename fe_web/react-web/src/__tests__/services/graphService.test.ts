import { beforeEach, describe, expect, it, vi } from 'vitest';
import { graphService } from '@/services/graphService';

vi.mock('@/services/api', () => ({ api: { post: vi.fn() } }));

describe('graphService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requests the sprint graph through GraphQL variables', async () => {
    const { api } = await import('@/services/api');
    vi.mocked(api.post).mockResolvedValue({ data: { data: { workspaceGraph: { nodes: [], edges: [] } } } });

    await graphService.getSprintGraph('workspace-1', 'sprint-1');

    expect(api.post).toHaveBeenCalledWith('/graphql', expect.objectContaining({
      query: expect.stringContaining('roles'),
      variables: {
        workspaceId: 'workspace-1', sprintId: 'sprint-1', backlogId: null, source: null,
        includeSimilarity: true, includeAssociation: true, minScore: 0.5, minConfidence: 0.3,
      },
    }), expect.any(Object));
  });
});
