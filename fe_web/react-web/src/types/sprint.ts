// Sprint types
export interface Sprint {
  id: string;
  name: string;
  status: 'ToDo' | 'InProgress' | 'Completed';
  startDate?: string;
  endDate?: string;
}

export interface CreateSprintRequest {
  name: string;
  startDate: string;
  endDate: string;
}
