import 'package:flutter/material.dart';
import '../../services/home/workspace_service.dart';
import '../../models/home/workspace_model.dart';
import '../../core/locator.dart';

class HomeViewModel extends ChangeNotifier {
  final _workspaceService = locator<WorkspaceService>();

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
