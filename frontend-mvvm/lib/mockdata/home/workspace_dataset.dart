import '../../models/home/workspace_model.dart';

class WorkspaceDataset {
  static List<WorkspaceModel> workspaces = [
    WorkspaceModel(
      id: "ws-1",
      name: "Dự án phát triển phần mềm",
      type: WorkspaceType.TEAM_MANAGED,
      access: WorkspaceAccess.PRIVATE,
      roles: [WorkspaceRole.ADMIN],
      createdAt: "2023-10-01T00:00:00Z",
      updatedAt: "2023-10-05T00:00:00Z",
      backlog: Backlog(id: "bl-1", name: "Backlog dự án 1"),
    ),
    WorkspaceModel(
      id: "ws-2",
      name: "Công việc thiết kế",
      type: WorkspaceType.COMPANY_MANAGED,
      access: WorkspaceAccess.OPEN,
      roles: [WorkspaceRole.MEMBER],
      createdAt: "2023-11-01T00:00:00Z",
      updatedAt: "2023-11-05T00:00:00Z",
      backlog: Backlog(id: "bl-2", name: "Backlog thiết kế"),
    ),
  ];
}
