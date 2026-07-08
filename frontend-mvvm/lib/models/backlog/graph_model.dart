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

  // NLP Attributes
  final double? subjectPriority;
  final double? verbPriority;
  final double? objectPriority;
  final double? performScore;
  final double? targetScore;
  final double? performConfidence;
  final double? targetConfidence;

  AnalyzedStory({
    required this.id,
    required this.rawText,
    required this.subject,
    required this.verb,
    required this.object,
    this.status = USStatus.todo,
    this.subjectPriority,
    this.verbPriority,
    this.objectPriority,
    this.performScore,
    this.targetScore,
    this.performConfidence,
    this.targetConfidence,
  });
}
