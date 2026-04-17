class NotificationModel {
  final String id;
  final String title;
  final String content;
  final String type;
  final String referenceId;
  final DateTime createdAt;
  final bool read;

  NotificationModel({
    required this.id,
    required this.title,
    required this.content,
    required this.type,
    required this.referenceId,
    required this.createdAt,
    required this.read,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Notification',
      content: json['content']?.toString() ?? '',
      type: json['type']?.toString() ?? '',
      referenceId: json['referenceId']?.toString() ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt']).toLocal()
          : DateTime.now(),
      read: json['read'] ?? false,
    );
  }
}
