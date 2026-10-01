// Sprint types
export { type Sprint, type CreateSprintRequest, SprintStatus } from './sprint';

// User Story types
export { type UserStory, type CreateUserStoryRequest, UserStoryStatus } from './userStory';

// Workspace types
export { WorkspaceType, WorkspaceAccess } from './workspace';
export type { Workspace, CreateWorkspaceRequest } from './workspace';

// Invitation types
export type { Invitation, SendInvitationRequest } from './invitation';

// Auth types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Workspace Member Response
export interface WorkspaceMemberResponse {
  userId: string;
  workspaceId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: string;
  user?: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };
}

// API Response types
export interface ApiResponse<T> {
  code: number;
  result?: T;
  message?: string;
}

// Common types
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
