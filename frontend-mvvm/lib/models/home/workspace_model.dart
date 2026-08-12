// lib/models/home/workspace_model.dart

enum WorkspaceType { TEAM_MANAGED, COMPANY_MANAGED }
enum WorkspaceAccess { OPEN, PRIVATE, LIMITED }
enum WorkspaceRole { ADMIN, MEMBER, VIEWER }

class Backlog {
  final String id;
  final String name;

  Backlog({required this.id, required this.name});

  factory Backlog.fromJson(Map<String, dynamic> json) {
    return Backlog(
      id: json['id']?.toString() ?? '', 
      name: json['name']?.toString() ?? ''
    );
  }
}

class WorkspaceModel {
  final String id;
  final String name;
  final WorkspaceType type;
  final WorkspaceAccess access;
  final Backlog? backlog;
  final List<WorkspaceRole> roles;
  final String createdAt;
  final String updatedAt;
  final String? ownerId;

  WorkspaceModel({
    required this.id,
    required this.name,
    required this.type,
    required this.access,
    this.backlog,
    this.roles = const [],
    required this.createdAt,
    required this.updatedAt,
    this.ownerId,
  });

  factory WorkspaceModel.fromJson(Map<String, dynamic> json) {
    try {
      return WorkspaceModel(
        id: json['id']?.toString() ?? '',
        name: json['name']?.toString() ?? '',
        type: WorkspaceType.values.firstWhere(
          (e) => e.name == json['type']?.toString(),
          orElse: () => WorkspaceType.TEAM_MANAGED,
        ),
        access: WorkspaceAccess.values.firstWhere(
          (e) => e.name == json['access']?.toString(),
          orElse: () => WorkspaceAccess.OPEN,
        ),
        backlog: json['backlog'] != null 
            ? Backlog.fromJson(Map<String, dynamic>.from(json['backlog'])) 
            : null,
        roles: (json['roles'] as List<dynamic>?)
                ?.map((e) => WorkspaceRole.values.firstWhere(
                      (role) => role.name == e?.toString(),
                      orElse: () => WorkspaceRole.MEMBER,
                    ))
                .toList() ??
            [],
        createdAt: json['createdAt']?.toString() ?? '',
        updatedAt: json['updatedAt']?.toString() ?? '',
        ownerId: json['ownerId']?.toString(),
      );
    } catch (e) {
      print('=== LỖI PARSE JSON WORKSPACE MODEL ===');
      print(e);
      rethrow; 
    }
  }
}

class WorkspaceResponse {
  final int code;
  final String message;
  final WorkspaceModel? result;

  WorkspaceResponse({required this.code, required this.message, this.result});

  factory WorkspaceResponse.fromJson(Map<String, dynamic> json) {
    return WorkspaceResponse(
      code: int.tryParse(json['code']?.toString() ?? '0') ?? 0,
      message: json['message']?.toString() ?? '',
      result: json['result'] != null && json['result'] is Map
          ? WorkspaceModel.fromJson(Map<String, dynamic>.from(json['result']))
          : null,
    );
  }
}