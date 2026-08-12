class MemberModel {
  final String userId;
  final String email;
  final String role;

  MemberModel({
    required this.userId,
    required this.email,
    required this.role,
  });

  factory MemberModel.fromJson(Map<String, dynamic> json) {
    return MemberModel(
      userId: json['userId'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? '',
    );
  }
}