// Workspace type constants (using const assertions for erasableSyntax compatibility)
export const WorkspaceType = {
  TEAM_MANAGED: 'TEAM_MANAGED',
  COMPANY_MANAGED: 'COMPANY_MANAGED',
} as const;
export type WorkspaceType = typeof WorkspaceType[keyof typeof WorkspaceType];

export const WorkspaceAccess = {
  OPEN: 'OPEN',
  PRIVATE: 'PRIVATE',
  LIMITED: 'LIMITED',
} as const;
export type WorkspaceAccess = typeof WorkspaceAccess[keyof typeof WorkspaceAccess];

export interface Backlog {
  id: string;
  name: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  type?: WorkspaceType;
  access?: WorkspaceAccess;
  backlog?: Backlog;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  type?: WorkspaceType;
  access?: WorkspaceAccess;
}
