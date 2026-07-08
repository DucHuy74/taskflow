import 'package:get_it/get_it.dart';

import '../services/home/workspace_service.dart';
import '../services/home/notification_service.dart';
import '../services/backlog/sprint_service.dart';
import '../services/backlog/backlog_service.dart';
import '../services/backlog/userstory_service.dart';

final locator = GetIt.instance;

void setupLocator() {
  locator.registerLazySingleton<WorkspaceService>(() => WorkspaceService());
  locator.registerLazySingleton<NotificationService>(
    () => NotificationService(),
  );
  locator.registerLazySingleton<SprintService>(() => SprintService());
  locator.registerLazySingleton<BacklogService>(() => BacklogService());
  locator.registerLazySingleton<UserStoryService>(() => UserStoryService());
}
