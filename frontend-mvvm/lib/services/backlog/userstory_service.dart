import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../auth/auth_service.dart';
import '../../models/backlog/task_status.dart';

import 'package:flutter_dotenv/flutter_dotenv.dart';

class UserStoryService {
  static String get _baseUrl =>
      dotenv.env['BASE_URL'] ?? 'http://localhost:8080/api';

  Future<bool> createUserStory({
    required String workspaceId,
    required String storyText,
    SprintStatus status = SprintStatus.ToDo,
  }) async {
    final url = Uri.parse('$_baseUrl/user-stories/workspace/$workspaceId');

    try {
      final token = await AuthService.instance.getValidAccessToken();

      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $token',
          'x-api-key': dotenv.env['API_KEY'] ?? '',
        },
        body: jsonEncode({
          "workspaceId": workspaceId,
          "storyText": storyText,
          "status": status.name,
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final body = jsonDecode(response.body);
        if (body['code'] == 1000) {
          return true;
        }
      }

      print(
        'Create User Story Error: ${response.statusCode} - ${response.body}',
      );
      return false;
    } catch (e) {
      print('Exception: $e');
      return false;
    }
  }

  /// Lấy chi tiết một User Story theo ID
  Future<Map<String, dynamic>?> getUserStoryById(String id) async {
    final url = Uri.parse('$_baseUrl/user-stories/$id');
    try {
      final token = await AuthService.instance.getValidAccessToken();
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
          'x-api-key': dotenv.env['API_KEY'] ?? '',
        },
      );
      if (response.statusCode == 200) {
        // Có thể backend bọc trong { result: {...} } hoặc trả trực tiếp object
        final data = jsonDecode(utf8.decode(response.bodyBytes));
        if (data is Map<String, dynamic>) {
          if (data.containsKey('result')) {
            return data['result'];
          }
          return data;
        }
      }
      print(
        'DEBUG getUserStoryById Error: ${response.statusCode} ${response.body}',
      );
    } catch (e) {
      print('Exception fetching user story by id: $e');
    }
    return null;
  }

  /// Hàm cập nhật trạng thái User Story
  Future<bool> updateUserStoryStatus({
    required String userStoryId,
    required SprintStatus status,
  }) async {
    final url = Uri.parse('$_baseUrl/user-stories/$userStoryId/status');

    try {
      final token = await AuthService.instance.getValidAccessToken();
      final response = await http.put(
        url,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $token',
          'x-api-key': dotenv.env['API_KEY'] ?? '',
        },
        body: jsonEncode({"status": status.name}),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final body = jsonDecode(response.body);
        if (body['code'] == 1000) {
          return true;
        }
      }

      print(
        'Update User Story Status Error: ${response.statusCode} - ${response.body}',
      );
      return false;
    } catch (e) {
      print('Exception when updating status: $e');
      return false;
    }
  }
}
