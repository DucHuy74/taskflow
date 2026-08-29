export enum WorkspaceType {
  TEAM_MANAGED = 'TEAM_MANAGED',
  COMPANY_MANAGED = 'COMPANY_MANAGED',
}

export enum WorkspaceAccess {
  OPEN = 'OPEN',
  PRIVATE = 'PRIVATE',
  LIMITED = 'LIMITED',
}

export interface Backlog {
  id: string;
  name: string;
}

export interface Workspace {
  id: string;
  name: string;
  type?: WorkspaceType;
  access?: WorkspaceAccess;
  backlog?: Backlog;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  type?: WorkspaceType;
  access?: WorkspaceAccess;
}
