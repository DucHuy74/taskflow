// Sprint types
export { type Sprint, type CreateSprintRequest, SprintStatus } from './sprint';

// User Story types
export { type UserStory, type CreateUserStoryRequest, type UpdateUserStoryRequest, UserStoryStatus } from './userStory';

// Workspace types
export { WorkspaceType, WorkspaceAccess } from './workspace';
export type { Workspace, CreateWorkspaceRequest, UpdateWorkspaceRequest } from './workspace';

// Invitation types
export type { Invitation, SendInvitationRequest } from './invitation';

// Notification, profile and access-control types
export type { NotificationResponse, NotificationType } from './notification';
export type { ProfileResponse } from './profile';
export type {
  Permission,
  RolePermissionMatrixResponse,
  ResourceGrantResponse,
  ResourceGrantRequest,
  ResourceType,
  PrincipalType,
  PermissionEffect,
  MyWorkspaceAccessResponse,
} from './acl';

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

// Workspace Member Response (backend WorkspaceMemberResponse)
export type WorkspaceRole = 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface WorkspaceMemberResponse {
  userId: string;
  email: string;
  role: WorkspaceRole;
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
