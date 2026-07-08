import '../../models/backlog/member_model.dart';

class MemberDataset {
  static List<MemberModel> members = [
    MemberModel(userId: "u-1", email: "admin@example.com", role: "ADMIN"),
    MemberModel(userId: "u-2", email: "developer1@example.com", role: "MEMBER"),
    MemberModel(userId: "u-3", email: "tester@example.com", role: "MEMBER"),
  ];
}
