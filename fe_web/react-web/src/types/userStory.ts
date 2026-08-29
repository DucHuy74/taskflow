// User Story types
export interface UserStory {
  id: string;
  storyText: string;
  status: 'ToDo' | 'InProgress' | 'Done';
  priority?: 'High' | 'Medium' | 'Low';
  acceptanceCriteria?: string;
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  sprintId?: string;
}

export interface CreateUserStoryRequest {
  storyText: string;
}
