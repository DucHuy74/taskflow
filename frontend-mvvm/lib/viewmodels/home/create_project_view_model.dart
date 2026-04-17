import 'package:flutter/material.dart';
import '../../services/home/workspace_service.dart';
import '../../models/home/workspace_model.dart'; 

class CreateProjectViewModel extends ChangeNotifier {
  final WorkspaceService _workspaceService = WorkspaceService();

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  WorkspaceType _getWorkspaceType(String uiValue) {
    if (uiValue == 'Team-managed') return WorkspaceType.TEAM_MANAGED;
    return WorkspaceType.COMPANY_MANAGED;
  }

  WorkspaceAccess _getWorkspaceAccess(String uiValue) {
    if (uiValue == 'Open') return WorkspaceAccess.OPEN;
    if (uiValue == 'Private') return WorkspaceAccess.PRIVATE;
    return WorkspaceAccess.LIMITED;
  }

  Future<WorkspaceResponse?> createProject({
    required String name,
    required String managementUiValue,
    required String accessUiValue,
  }) async {
    _isLoading = true;
    notifyListeners();

    final response = await _workspaceService.createWorkspace(
      name: name,
      type: _getWorkspaceType(managementUiValue),
      access: _getWorkspaceAccess(accessUiValue),
    );

    _isLoading = false;
    notifyListeners();

    return response;
  }
}