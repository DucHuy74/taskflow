import 'package:flutter/material.dart';
import '../../services/home/workspace_service.dart';
import '../../models/home/workspace_model.dart';

class HomeViewModel extends ChangeNotifier {
  final WorkspaceService _workspaceService = WorkspaceService();

  List<WorkspaceModel> _workspaces = [];
  List<WorkspaceModel> get workspaces => _workspaces;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  Future<void> fetchWorkspaces() async {
    _isLoading = true;
    notifyListeners();

    try {
      _workspaces = await _workspaceService.getWorkspaces();
    } catch (e) {
      _workspaces = [];
    }

    _isLoading = false;
    notifyListeners();
  }
}
