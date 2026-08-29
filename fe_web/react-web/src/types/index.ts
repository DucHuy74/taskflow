// Sprint types
export type { Sprint, CreateSprintRequest } from './sprint';

// User Story types
export type { UserStory, CreateUserStoryRequest } from './userStory';

// Workspace types
export type { Workspace, CreateWorkspaceRequest } from './workspace';

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
