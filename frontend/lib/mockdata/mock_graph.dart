enum USStatus { todo, inProgress, done }

class AnalyzedStory {
  final String id;
  final String rawText;
  final String subject;
  final String verb;
  final String object;
  final String workspaceId;
  USStatus status;
  bool isInSprint;

  AnalyzedStory({
    required this.id,
    required this.rawText,
    required this.subject,
    required this.verb,
    required this.object,
    required this.workspaceId,
    this.status = USStatus.todo,
    this.isInSprint = false,
  });
}

final List<AnalyzedStory> mockBacklogData = [
  AnalyzedStory(
    id: 'us_001',
    rawText: "As a user, I want to login the system",
    subject: "User",
    verb: "login",
    object: "system",
    workspaceId: "WS01",
    status: USStatus.done,
  ),
  AnalyzedStory(
    id: 'us_002',
    rawText: "As an admin, I want to delete users",
    subject: "Admin",
    verb: "delete",
    object: "users",
    workspaceId: "WS01",
    status: USStatus.inProgress,
  ),
  AnalyzedStory(
    id: 'us_003',
    rawText: "As a user, I want to view profile",
    subject: "User",
    verb: "view",
    object: "profile",
    workspaceId: "WS01",
  ),
  AnalyzedStory(
    id: 'us_004',
    rawText: "As an admin, I want to login the system",
    subject: "Admin",
    verb: "login",
    object: "system",
    workspaceId: "WS01",
  ),
  AnalyzedStory(
    id: 'us_005',
    rawText: "As a Product Owner, I want to login the system",
    subject: "Product Owner",
    verb: "login",
    object: "system",
    workspaceId: "WS01",
  ),
  AnalyzedStory(
    id: 'us_006',
    rawText: "As a Product Backlog, I want to login the system",
    subject: "Product Backlog",
    verb: "login",
    object: "system",
    workspaceId: "WS01",
  ),
];
