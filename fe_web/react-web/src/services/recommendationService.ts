import { api } from './api';
import type {
  DuplicateRecommendation,
  RecommendationConfidence,
  RecommendationDecision,
  RecommendationJob,
  RecommendationListResponse,
  RecommendationStatus,
  WorkspaceRecommendationAccess,
} from '@/types/recommendation';

interface ApiResponse<T> {
  code: number;
  result?: T;
  message?: string;
}

function resultOf<T>(response: { data: ApiResponse<T> }): T {
  if (response.data.code !== 1000 || response.data.result === undefined) {
    throw new Error(response.data.message || 'Recommendation request failed');
  }
  return response.data.result;
}

export const recommendationService = {
  async list(
    workspaceId: string,
    filters: { type?: 'POSSIBLE_DUPLICATE'; status?: RecommendationStatus; confidence?: RecommendationConfidence; cursor?: string; limit?: number } = {},
  ): Promise<RecommendationListResponse> {
    const response = await api.get<ApiResponse<RecommendationListResponse>>(
      `/workspaces/${workspaceId}/recommendations`,
      { params: { type: filters.type, status: filters.status || 'OPEN', confidence: filters.confidence, cursor: filters.cursor, limit: filters.limit || 20 } },
    );
    return resultOf(response);
  },

  async detail(workspaceId: string, recommendationId: string): Promise<DuplicateRecommendation> {
    return resultOf(await api.get<ApiResponse<DuplicateRecommendation>>(
      `/workspaces/${workspaceId}/recommendations/${recommendationId}`,
    ));
  },

  async decide(
    workspaceId: string,
    recommendation: DuplicateRecommendation,
    decision: RecommendationDecision,
    note?: string,
  ): Promise<DuplicateRecommendation> {
    return resultOf(await api.post<ApiResponse<DuplicateRecommendation>>(
      `/workspaces/${workspaceId}/recommendations/${recommendation.id}/decision`,
      { decision, note, version: recommendation.version },
      { headers: { 'Idempotency-Key': crypto.randomUUID() } },
    ));
  },

  async latestJob(workspaceId: string): Promise<RecommendationJob | null> {
    try {
      return resultOf(await api.get<ApiResponse<RecommendationJob>>(
        `/workspaces/${workspaceId}/recommendation-jobs/latest`,
      ));
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 404) return null;
      throw error;
    }
  },

  async access(workspaceId: string): Promise<WorkspaceRecommendationAccess> {
    return resultOf(await api.get<ApiResponse<WorkspaceRecommendationAccess>>(
      `/workspace/${workspaceId}/my-access`,
    ));
  },
};
