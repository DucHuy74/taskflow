import { api } from './api';
import type { WorkspaceRole } from '@/types';
import type {
  MyWorkspaceAccessResponse,
  Permission,
  ResourceGrantRequest,
  ResourceGrantResponse,
  ResourceType,
  RolePermissionMatrixResponse,
} from '@/types/acl';

interface ApiResponse<T> {
  code: number;
  result?: T;
  message?: string;
}

function resultOf<T>(response: { data: ApiResponse<T> }, fallback: string): T {
  if (response.data.code !== 1000 || response.data.result === undefined || response.data.result === null) {
    throw new Error(response.data.message || fallback);
  }
  return response.data.result;
}

function assertSuccess(response: { data: ApiResponse<unknown> }, fallback: string): void {
  if (response.data.code !== 1000) {
    throw new Error(response.data.message || fallback);
  }
}

/** Workspace roles & ACL endpoints (WorkspaceRoleController, /workspace/{workspaceId}/...). */
export const workspaceRoleService = {
  /** GET /workspace/{id}/permission-matrix (requires WORKSPACE_BROWSE). */
  async getPermissionMatrix(workspaceId: string): Promise<RolePermissionMatrixResponse[]> {
    return resultOf(
      await api.get<ApiResponse<RolePermissionMatrixResponse[]>>(`/workspace/${workspaceId}/permission-matrix`),
      'Unable to load permission matrix',
    );
  },

  /** PUT /workspace/{id}/roles/{role}/permissions (requires WORKSPACE_ADMINISTER). */
  async updateRolePermissions(
    workspaceId: string,
    role: WorkspaceRole,
    permissions: Permission[],
  ): Promise<RolePermissionMatrixResponse> {
    return resultOf(
      await api.put<ApiResponse<RolePermissionMatrixResponse>>(
        `/workspace/${workspaceId}/roles/${role}/permissions`,
        { permissions },
      ),
      'Unable to update role permissions',
    );
  },

  /** PUT /workspace/{id}/members/{userId}/role (requires MEMBER_MANAGE). */
  async changeMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<void> {
    assertSuccess(
      await api.put<ApiResponse<void>>(`/workspace/${workspaceId}/members/${userId}/role`, { role }),
      'Unable to change member role',
    );
  },

  /** GET /workspace/{id}/my-access */
  async getMyAccess(workspaceId: string): Promise<MyWorkspaceAccessResponse> {
    const access = resultOf(
      await api.get<ApiResponse<MyWorkspaceAccessResponse>>(`/workspace/${workspaceId}/my-access`),
      'Unable to load workspace access',
    );
    return { ...access, permissions: access.permissions ?? [], grants: access.grants ?? [] };
  },

  /** GET /workspace/{id}/grants?resourceType=&resourceId= (requires ACL_READ). */
  async listGrants(
    workspaceId: string,
    filters: { resourceType?: ResourceType; resourceId?: string } = {},
  ): Promise<ResourceGrantResponse[]> {
    const params: Record<string, string> = {};
    if (filters.resourceType) params.resourceType = filters.resourceType;
    if (filters.resourceId) params.resourceId = filters.resourceId;
    return resultOf(
      await api.get<ApiResponse<ResourceGrantResponse[]>>(`/workspace/${workspaceId}/grants`, { params }),
      'Unable to load access grants',
    );
  },

  /** POST /workspace/{id}/grants (requires ACL_WRITE). */
  async createGrant(workspaceId: string, request: ResourceGrantRequest): Promise<ResourceGrantResponse> {
    return resultOf(
      await api.post<ApiResponse<ResourceGrantResponse>>(`/workspace/${workspaceId}/grants`, request),
      'Unable to create access grant',
    );
  },

  /** DELETE /workspace/{id}/grants/{grantId} (requires ACL_WRITE). */
  async deleteGrant(workspaceId: string, grantId: string): Promise<void> {
    assertSuccess(
      await api.delete<ApiResponse<void>>(`/workspace/${workspaceId}/grants/${grantId}`),
      'Unable to delete access grant',
    );
  },
};

export default workspaceRoleService;
