// user_profile_model.dart

class UserProfile {
  final String profileId;
  final String firstName;
  final String lastName;
  final String email;
  final String dob;
  final String username;

  UserProfile({
    required this.profileId,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.dob,
    required this.username,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      profileId: json['profileId'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      email: json['email'] ?? '',
      dob: json['dob'] ?? '',
      username: json['username'] ?? '',
    );
  }
}