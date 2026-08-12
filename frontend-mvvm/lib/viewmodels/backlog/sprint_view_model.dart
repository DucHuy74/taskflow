import 'package:flutter/material.dart';
import '../../services/backlog/sprint_service.dart';
import '../../models/backlog/user_story_model.dart';
import '../../models/backlog/sprint_model.dart';
import '../../services/backlog/userstory_service.dart';
import '../../models/backlog/task_status.dart';

class SprintViewModel extends ChangeNotifier {
  final SprintService _sprintService = SprintService();
  final UserStoryService _userStoryService = UserStoryService();

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  List<UserStoryModel> _stories = [];
  List<UserStoryModel> get stories => _stories;

  Future<bool> createSprint({
    required String workspaceId,
    required String name,
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    _isLoading = true;
    notifyListeners();

    final success = await _sprintService.createSprint(
      workspaceId: workspaceId,
      name: name,
      startDate: startDate,
      endDate: endDate,
    );

    _isLoading = false;
    notifyListeners();
    return success;
  }

  Future<void> fetchStoriesInSprint(String sprintId) async {
    _isLoading = true;
    notifyListeners();

    _stories = await _sprintService.getStoriesInSprint(sprintId);

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> startSprint(String sprintId) async {
    _isLoading = true;
    notifyListeners();

    final success = await _sprintService.startSprint(sprintId);

    _isLoading = false;
    notifyListeners();
    return success;
  }

  Future<bool> completeSprint(String sprintId) async {
    _isLoading = true;
    notifyListeners();

    final success = await _sprintService.completeSprint(sprintId);

    _isLoading = false;
    notifyListeners();
    return success;
  }

  Future<bool> updateUserStoryStatus(
    String userStoryId,
    SprintStatus status,
  ) async {
    _isLoading = true;
    notifyListeners();

    final success = await _userStoryService.updateUserStoryStatus(
      userStoryId: userStoryId,
      status: status,
    );

    _isLoading = false;
    notifyListeners();
    return success;
  }
}
