import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recommendationService } from '@/services/recommendationService';
import type { DuplicateRecommendation } from '@/types/recommendation';

vi.mock('@/services/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

const recommendation: DuplicateRecommendation = {
  id: 'rec-1',
  type: 'POSSIBLE_DUPLICATE',
  status: 'OPEN',
  confidence: { band: 'HIGH', score: 0.9, calibrated: false },
  title: 'Possible duplicate',
  stories: [
    { id: 'US-1', text: 'Reset password', graphRelevanceScore: null, parseConfidence: null },
    { id: 'US-2', text: 'Recover password', graphRelevanceScore: null, parseConfidence: null },
  ],
  evidence: [],
  suggestedAction: { type: 'MERGE_REVIEW', representativeStoryId: 'US-1' },
  modelVersion: 'heuristic-v1',
  policyVersion: 'deterministic-v1',
  generatedAt: '2026-10-03T00:00:00Z',
  version: 2,
};

describe('recommendationService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends optimistic version and an idempotency key with a decision', async () => {
    const { api } = await import('@/services/api');
    vi.mocked(api.post).mockResolvedValue({ data: { code: 1000, result: { ...recommendation, status: 'REJECTED' } } });

    await recommendationService.decide('ws-1', recommendation, 'KEEP_SEPARATE', 'Different account types');

    expect(api.post).toHaveBeenCalledWith(
      '/workspaces/ws-1/recommendations/rec-1/decision',
      { decision: 'KEEP_SEPARATE', note: 'Different account types', version: 2 },
      { headers: { 'Idempotency-Key': expect.any(String) } },
    );
  });

  it('uses the stable cursor and filters when loading the queue', async () => {
    const { api } = await import('@/services/api');
    vi.mocked(api.get).mockResolvedValue({
      data: { code: 1000, result: { data: [], page: { nextCursor: null, hasMore: false }, summary: { open: 0, high: 0, medium: 0 } } },
    });

    await recommendationService.list('ws-1', { confidence: 'HIGH', cursor: 'cursor-1', limit: 10 });

    expect(api.get).toHaveBeenCalledWith('/workspaces/ws-1/recommendations', {
      params: { status: 'OPEN', confidence: 'HIGH', cursor: 'cursor-1', limit: 10 },
    });
  });
});
