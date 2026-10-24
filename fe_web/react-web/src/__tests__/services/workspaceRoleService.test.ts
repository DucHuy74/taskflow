import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workspaceRoleService } from '@/services/workspaceRoleService';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('workspaceRoleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getPermissionMatrix should GET the matrix', async () => {
    const { api } = await import('@/services/api');
    const matrix = [
      { role: 'ADMIN', permissions: ['WORKSPACE_ADMINISTER'] },
      { role: 'VIEWER', permissions: ['WORKSPACE_BROWSE'] },
    ];
    vi.mocked(api.get).mockResolvedValue({ data: { code: 1000, result: matrix } });

    const result = await workspaceRoleService.getPermissionMatrix('ws-1');

    expect(api.get).toHaveBeenCalledWith('/workspace/ws-1/permission-matrix');
    expect(result).toEqual(matrix);
  });

  it('getPermissionMatrix should throw on non-success code', async () => {
    const { api } = await import('@/services/api');
    vi.mocked(api.get).mockResolvedValue({ data: { code: 1014, message: 'You do not have permission' } });

    await expect(workspaceRoleService.getPermissionMatrix('ws-1')).rejects.toThrow('You do not have permission');
  });

  it('updateRolePermissions should PUT { permissions } for the role', async () => {
    const { api } = await import('@/services/api');
    const updated = { role: 'MEMBER', permissions: ['ISSUE_VIEW', 'ISSUE_CREATE'] };
    vi.mocked(api.put).mockResolvedValue({ data: { code: 1000, result: updated } });

    const result = await workspaceRoleService.updateRolePermissions('ws-1', 'MEMBER', ['ISSUE_VIEW', 'ISSUE_CREATE']);

    expect(api.put).toHaveBeenCalledWith('/workspace/ws-1/roles/MEMBER/permissions', {
      permissions: ['ISSUE_VIEW', 'ISSUE_CREATE'],
    });
    expect(result).toEqual(updated);
  });

  it('changeMemberRole should PUT { role } and accept a void result', async () => {
    const { api } = await import('@/services/api');
    vi.mocked(api.put).mockResolvedValue({ data: { code: 1000, message: 'Member role updated' } });

    await expect(workspaceRoleService.changeMemberRole('ws-1', 'user-2', 'VIEWER')).resolves.toBeUndefined();
    expect(api.put).toHaveBeenCalledWith('/workspace/ws-1/members/user-2/role', { role: 'VIEWER' });
  });

  it('changeMemberRole should propagate CANNOT_DEMOTE_LAST_ADMIN errors', async () => {
    const { api } = await import('@/services/api');
    const error = Object.assign(new Error('400'), { response: { status: 400, data: { code: 1031, message: 'Cannot change the last admin' } } });
    vi.mocked(api.put).mockRejectedValue(error);

    await expect(workspaceRoleService.changeMemberRole('ws-1', 'user-1', 'MEMBER')).rejects.toBe(error);
  });

  it('getMyAccess should normalise missing arrays', async () => {
    const { api } = await import('@/services/api');
    vi.mocked(api.get).mockResolvedValue({ data: { code: 1000, result: { role: 'MEMBER', permissions: null, grants: null } } });

    const result = await workspaceRoleService.getMyAccess('ws-1');

    expect(api.get).toHaveBeenCalledWith('/workspace/ws-1/my-access');
    expect(result).toEqual({ role: 'MEMBER', permissions: [], grants: [] });
  });

  it('listGrants should send no params without filters', async () => {
    const { api } = await import('@/services/api');
    vi.mocked(api.get).mockResolvedValue({ data: { code: 1000, result: [] } });

    await workspaceRoleService.listGrants('ws-1');

    expect(api.get).toHaveBeenCalledWith('/workspace/ws-1/grants', { params: {} });
  });

  it('listGrants should pass resourceType and resourceId query params', async () => {
    const { api } = await import('@/services/api');
    const grants = [{ id: 'g1', workspaceId: 'ws-1', resourceType: 'SPRINT', resourceId: 's1', principalType: 'ROLE', principalId: 'VIEWER', permission: 'SPRINT_VIEW', effect: 'DENY' }];
    vi.mocked(api.get).mockResolvedValue({ data: { code: 1000, result: grants } });

    const result = await workspaceRoleService.listGrants('ws-1', { resourceType: 'SPRINT', resourceId: 's1' });

    expect(api.get).toHaveBeenCalledWith('/workspace/ws-1/grants', { params: { resourceType: 'SPRINT', resourceId: 's1' } });
    expect(result).toEqual(grants);
  });

  it('createGrant should POST the grant request', async () => {
    const { api } = await import('@/services/api');
    const request = {
      resourceType: 'USER_STORY' as const,
      resourceId: 'story-1',
      principalType: 'USER' as const,
      principalId: 'user-1',
      permission: 'ISSUE_EDIT' as const,
      effect: 'ALLOW' as const,
    };
    const created = { id: 'g2', workspaceId: 'ws-1', ...request };
    vi.mocked(api.post).mockResolvedValue({ data: { code: 1000, result: created } });

    const result = await workspaceRoleService.createGrant('ws-1', request);

    expect(api.post).toHaveBeenCalledWith('/workspace/ws-1/grants', request);
    expect(result).toEqual(created);
  });

  it('deleteGrant should DELETE the grant', async () => {
    const { api } = await import('@/services/api');
    vi.mocked(api.delete).mockResolvedValue({ data: { code: 1000, message: 'Grant deleted' } });

    await workspaceRoleService.deleteGrant('ws-1', 'g2');

    expect(api.delete).toHaveBeenCalledWith('/workspace/ws-1/grants/g2');
  });

  it('deleteGrant should throw on non-success code', async () => {
    const { api } = await import('@/services/api');
    vi.mocked(api.delete).mockResolvedValue({ data: { code: 1014, message: 'You do not have permission' } });

    await expect(workspaceRoleService.deleteGrant('ws-1', 'g2')).rejects.toThrow('You do not have permission');
  });
});
