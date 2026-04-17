import 'package:flutter/material.dart';
import '../../models/backlog/member_model.dart';
import '../../services/home/workspace_service.dart';

class WorkspaceMemberViewModel extends ChangeNotifier {
  final WorkspaceService _service = WorkspaceService();
  
  List<MemberModel> _members = [];
  List<MemberModel> get members => _members;

  bool _isLoading = true;
  bool get isLoading => _isLoading;

  Future<void> fetchMembers(String workspaceId) async {
    _isLoading = true;
    notifyListeners();

    try {
      _members = await _service.getWorkspaceMembers(workspaceId);
    } catch (e) {
      _members = [];
    }

    _isLoading = false;
    notifyListeners();
  }
}
