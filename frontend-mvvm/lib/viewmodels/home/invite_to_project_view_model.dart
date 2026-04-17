import 'package:flutter/material.dart';
import '../../services/home/invite_to_project_service.dart';

class InviteViewModel extends ChangeNotifier {
  final InvitationService _service = InvitationService();

  final List<String> _invitedMembers = [];
  String _selectedRole = 'Administrator'; 
  bool _isLoading = false;
  String? _errorMessage;

  List<String> get invitedMembers => _invitedMembers;
  String get selectedRole => _selectedRole;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  void addMember(String email) {
    if (email.isNotEmpty && !_invitedMembers.contains(email)) {
      _invitedMembers.add(email);
      notifyListeners();
    }
  }

  void removeMember(String email) {
    _invitedMembers.remove(email);
    notifyListeners();
  }

  void setRole(String? role) {
    if (role != null) {
      _selectedRole = role;
      notifyListeners();
    }
  }

  String _mapRoleToBackend(String uiRole) {
    switch (uiRole) {
      case 'Administrator':
        return 'ADMIN';
      case 'Viewer':
        return 'VIEWER';
      case 'Member':
      default:
        return 'MEMBER';
    }
  }

  Future<bool> submitInvitations(
    String workspaceId, {
    String? currentInputEmail,
  }) async {
    if (currentInputEmail != null && currentInputEmail.trim().isNotEmpty) {
      addMember(currentInputEmail.trim());
    }

    if (_invitedMembers.isEmpty) {
      _errorMessage = "Please add at least one email";
      notifyListeners();
      return false;
    }

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final backendRole = _mapRoleToBackend(_selectedRole);
      final success = await _service.sendInvites(workspaceId, _invitedMembers, backendRole);

      if (success) {
        _invitedMembers.clear();
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = "Some invitations failed. Please try again.";
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}