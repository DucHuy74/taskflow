export type RecommendationStatus = 'OPEN' | 'ACCEPTED' | 'REJECTED' | 'DEFERRED' | 'STALE';
export type RecommendationDecision = 'MERGE' | 'KEEP_SEPARATE' | 'DEFER';
export type RecommendationConfidence = 'HIGH' | 'MEDIUM';

export interface RecommendationStory {
  id: string;
  text: string;
  graphRelevanceScore: number | null;
  parseConfidence: number | null;
}

export interface RecommendationEvidence {
  code: string;
  label: string;
  value?: number;
}

export interface DuplicateRecommendation {
  id: string;
  type: 'POSSIBLE_DUPLICATE';
  status: RecommendationStatus;
  confidence: { band: RecommendationConfidence; score: number; calibrated: boolean };
  title: string;
  stories: [RecommendationStory, RecommendationStory];
  evidence: RecommendationEvidence[];
  suggestedAction: { type: 'MERGE_REVIEW'; representativeStoryId: string };
  modelVersion: string;
  policyVersion: string;
  generatedAt: string;
  version: number;
}

export interface RecommendationListResponse {
  data: DuplicateRecommendation[];
  page: { nextCursor: string | null; hasMore: boolean };
  summary: { open: number; high: number; medium: number };
}

export interface RecommendationJob {
  id: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  stage?: 'LOADING' | 'EMBEDDING' | 'RETRIEVING' | 'SCORING' | 'PUBLISHING';
  progress: number;
  candidateCount: number;
  errorCode?: string;
  startedAt?: string;
  completedAt?: string;
  lastSuccessfulRunAt?: string;
}

export interface WorkspaceRecommendationAccess {
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  permissions: string[];
}
