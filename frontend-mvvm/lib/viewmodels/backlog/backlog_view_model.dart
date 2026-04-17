import 'package:flutter/material.dart';
import '../../services/backlog/backlog_service.dart';
import '../../services/backlog/sprint_service.dart';
import '../../models/backlog/user_story_model.dart';
import '../../models/backlog/sprint_model.dart';

class BacklogViewModel extends ChangeNotifier {
  final BacklogService _backlogService = BacklogService();
  final SprintService _sprintService = SprintService();

  List<UserStoryModel> _backlogList = [];
  List<UserStoryModel> get backlogList => _backlogList;

  List<SprintModel> _sprintList = [];
  List<SprintModel> get sprintList => _sprintList;

  bool get hasActiveSprint => _sprintList.isNotEmpty;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  Future<void> fetchBacklog(String workspaceId) async {
    _isLoading = true;
    notifyListeners();

    _backlogList = await _backlogService.getBacklog(workspaceId);

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> createStory(String workspaceId, String text) async {
    if (text.trim().isEmpty) return false;

    _isLoading = true;
    notifyListeners();

    final success = await _backlogService.createUserStory(
      workspaceId: workspaceId,
      storyText: text,
    );

    if (success) {
      await fetchBacklog(workspaceId);
    } else {
      _isLoading = false;
      notifyListeners();
    }

    return success;
  }

  Future<void> fetchSprints(String workspaceId) async {
    final sprints = await _sprintService.getSprints(workspaceId);
    _sprintList = sprints;

    notifyListeners();
  }

  Future<void> createSprintRefresh({
    required String workspaceId,
    required VoidCallback onSuccess,
  }) async {
    await fetchSprints(workspaceId);
    onSuccess();
  }

  Future<bool> addStoryToSprint({
    required String sprintId,
    required String userStoryId,
  }) async {
    _isLoading = true;
    notifyListeners();

    final success = await _sprintService.addStoryToSprint(
      sprintId: sprintId,
      userStoryId: userStoryId,
    );

    _isLoading = false;
    notifyListeners();
    return success;
  }
}
