// Sprint types - using const assertions for erasableSyntax compatibility
export const SprintStatus = {
  TODO: 'ToDo',
  IN_PROGRESS: 'InProgress',
  COMPLETED: 'Completed',
} as const;
export type SprintStatus = typeof SprintStatus[keyof typeof SprintStatus];

export interface Sprint {
  id: string;
  name: string;
  status: SprintStatus;
  startDate?: string;
  endDate?: string;
  workspaceId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSprintRequest {
  name: string;
  startDate: string;
  endDate: string;
}
