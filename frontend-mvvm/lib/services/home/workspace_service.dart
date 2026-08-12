import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../../models/home/workspace_model.dart';
import '../auth/auth_service.dart';
import '../../models/backlog/member_model.dart';

class WorkspaceService {
  static const String url = 'http://localhost:8080/api/workspace';

  // --- Lấy workspace ---
  Future<List<WorkspaceModel>> getWorkspaces() async {
    try {
      final token = await AuthService.instance.getValidAccessToken();
      if (token == null) return [];

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
          'x-api-key': dotenv.env['API_KEY'] ?? '',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['code'] == 1000) {
          final List<dynamic> results = data['result'];
          return results.map((e) => WorkspaceModel.fromJson(e)).toList();
        }
      }
      return [];
    } catch (e) {
      print('Error loading workspaces: $e');
      return [];
    }
  }

  // --- Tạo workspace ---
  static const String baseUrl = 'http://localhost:8080/api/workspace';

  Future<WorkspaceResponse?> createWorkspace({
    required String name,
    required WorkspaceType type,
    required WorkspaceAccess access,
  }) async {
    try {
      final token = await AuthService.instance.getValidAccessToken();

      if (token == null) {
        print('Error: No valid access token found');
        return null;
      }

      final response = await http.post(
        Uri.parse(baseUrl),
        headers: <String, String>{
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $token',
          'x-api-key': dotenv.env['API_KEY'] ?? '',
        },
        body: jsonEncode(<String, String>{
          'name': name,
          'type': type.name,
          'access': access.name,
        }),
      );

      if (response.statusCode == 200) {
        return WorkspaceResponse.fromJson(jsonDecode(response.body));
      } else {
        print('Server Error: ${response.statusCode} - ${response.body}');
        try {
          return WorkspaceResponse.fromJson(jsonDecode(response.body));
        } catch (_) {
          return null;
        }
      }
    } catch (e) {
      print('Connection Error: $e');
      return null;
    }
  }

  Future<List<MemberModel>> getWorkspaceMembers(String workspaceId) async {
    try {
      final token = await AuthService.instance.getValidAccessToken();
      if (token == null) return [];

      final response = await http.get(
        Uri.parse('$url/$workspaceId/members'), 
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
          'x-api-key': dotenv.env['API_KEY'] ?? '',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['code'] == 1000) {
          final List<dynamic> results = data['result'];
          return results.map((e) => MemberModel.fromJson(e)).toList();
        }
      }
      return [];
    } catch (e) {
      print('Error loading members: $e');
      return [];
    }
  }

  // Rebuild Graph
  Future<bool> rebuildGraph(String workspaceId) async {
    final requestUrl = Uri.parse('$baseUrl/$workspaceId/rebuild-graph');
    final token = await AuthService.instance.getValidAccessToken();

    try {
      final response = await http.post(
        requestUrl,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $token',
          'x-api-key': dotenv.env['API_KEY'] ?? '',
        },
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return true;
      } else {
        print('Lỗi gọi Graph API: Status ${response.statusCode}');
        return false;
      }
    } catch (e) {
      print('Exception fetching graph: $e');
      return false;
    }
  }
}
