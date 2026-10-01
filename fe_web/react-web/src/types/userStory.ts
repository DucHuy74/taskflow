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
  sprintId?: string;
  workspaceId?: string;
  backlogId?: string;
  createdAt?: string;
  updatedAt?: string;
  analysisStatus?: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string;
  parseMethod?: string;
  confidence?: number;
}

export interface CreateUserStoryRequest {
  storyText: string;
}
