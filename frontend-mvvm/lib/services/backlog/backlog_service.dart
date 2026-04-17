import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../auth/auth_service.dart';
import '../../models/backlog/user_story_model.dart';

class BacklogService {
  static const String _baseUrl = 'http://localhost:8080/api';

  Future<List<UserStoryModel>> getBacklog(String workspaceId) async {
    final url = Uri.parse('$_baseUrl/user-stories/workspace/$workspaceId/backlog');

    try {
      final token = await AuthService.instance.getValidAccessToken();
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $token',
          'x-api-key': dotenv.env['API_KEY'] ?? '',
        },
      );

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['code'] == 1000 && body['result'] != null) {
          final List<dynamic> list = body['result'];
          return list.map((e) => UserStoryModel.fromJson(e)).toList();
        }
      }
      return [];
    } catch (e) {
      print('Get Backlog Error: $e');
      return [];
    }
  }

  Future<bool> createUserStory({
    required String workspaceId,
    required String storyText,
    String status = 'ToDo',
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
          "status": status,
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final body = jsonDecode(response.body);
        if (body['code'] == 1000) {
          return true;
        }
      }
      return false;
    } catch (e) {
      print('Create Error: $e');
      return false;
    }
  }
}