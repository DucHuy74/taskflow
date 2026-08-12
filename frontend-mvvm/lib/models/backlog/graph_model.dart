// lib/models/graph/analyzed_story.dart

enum USStatus { todo, inProgress, done }
enum NodeType { subject, verb, object }

class AnalyzedStory {
  final String id;
  final String rawText;
  final String subject;
  final String verb;
  final String object;
  USStatus status;

  AnalyzedStory({
    required this.id,
    required this.rawText,
    required this.subject,
    required this.verb,
    required this.object,
    this.status = USStatus.todo,
  });
}