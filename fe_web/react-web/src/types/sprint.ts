// Sprint types - using const assertions for erasableSyntax compatibility
export const SprintStatus = {
  TODO: 'ToDo',
  IN_PROGRESS: 'InProgress',
  DONE: 'Done',
} as const;
export type SprintStatus = typeof SprintStatus[keyof typeof SprintStatus];

/** Mirrors backend SprintResponse. Dates are 'YYYY-MM-DD' or null when unset. */
export interface Sprint {
  id: string;
  name: string;
  status: SprintStatus;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string;
  workspaceId?: string;
  updatedAt?: string;
}

/** Body for POST /sprints/workspace/{id}. Dates are optional 'YYYY-MM-DD'; endDate >= startDate. */
export interface CreateSprintRequest {
  name: string;
  startDate?: string | null;
  endDate?: string | null;
}

/** Body for PUT /sprints/{id}. Missing dates CLEAR them on the backend, so send the current values. */
export interface UpdateSprintRequest {
  name: string;
  startDate: string | null;
  endDate: string | null;
}
