// User Story types - using const assertions for erasableSyntax compatibility
export const UserStoryStatus = {
  TODO: 'ToDo',
  IN_PROGRESS: 'InProgress',
  DONE: 'Done',
} as const;
export type UserStoryStatus = typeof UserStoryStatus[keyof typeof UserStoryStatus];

export interface UserStory {
  id: string;
  storyText: string;
  status: UserStoryStatus;
  priority?: 'High' | 'Medium' | 'Low';
  acceptanceCriteria?: string;
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  /** Optimistic-locking version; must be sent back on PUT /user-stories/{id}. */
  version?: number;
  sprintId?: string | null;
  workspaceId?: string;
  backlogId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  analysisStatus?: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string;
  parseMethod?: string;
  confidence?: number;
}

export interface CreateUserStoryRequest {
  storyText: string;
}

export interface UpdateUserStoryRequest {
  storyText: string;
  version: number;
}
