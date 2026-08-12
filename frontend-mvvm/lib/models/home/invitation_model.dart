class InvitationModel {
  final String id;
  final String workspaceId;
  final String inviterId;
  final DateTime expiredAt;

  InvitationModel({
    required this.id,
    required this.workspaceId,
    required this.inviterId,
    required this.expiredAt,
  });

  factory InvitationModel.fromJson(Map<String, dynamic> json) {
    return InvitationModel(
      id: json['id'],
      workspaceId: json['workspaceId'],
      inviterId: json['inviterId'],
      expiredAt: DateTime.parse(json['expiredAt']),
    );
  }
}