class UserStoryModel {
  final String id;
  final String storyText;
  final String status;

  UserStoryModel({
    required this.id,
    required this.storyText,
    required this.status,
  });

  factory UserStoryModel.fromJson(Map<String, dynamic> json) {
    return UserStoryModel(
      id: json['id'] ?? '',
      storyText: json['storyText'] ?? '',
      status: json['status'] ?? 'ToDo',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'storyText': storyText,
      'status': status,
    };
  }

  UserStoryModel copyWith({
    String? id,
    String? storyText,
    String? status,
  }) {
    return UserStoryModel(
      id: id ?? this.id,
      storyText: storyText ?? this.storyText,
      status: status ?? this.status,
    );
  }
}