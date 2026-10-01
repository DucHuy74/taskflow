import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../auth/auth_service.dart';
import '../../models/backlog/user_story_model.dart';
import '../../mockdata/backlog/user_story_dataset.dart';

import 'package:flutter_dotenv/flutter_dotenv.dart';

class BacklogService {
  static String get _baseUrl => dotenv.env['BASE_URL'] ?? 'http://localhost:8080/api';

  Future<List<UserStoryModel>> getBacklog(String workspaceId) async {
    try {
      final useMock = dotenv.env['USE_MOCK'] == 'true';

      if (useMock) {
        await Future.delayed(const Duration(seconds: 1)); // Mock network delay
        return UserStoryDataset.userStories;
      }

      final url = Uri.parse(
        '$_baseUrl/user-stories/workspace/$workspaceId/backlog',
      );
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

  // Tạo UserStory
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
        body: jsonEncode([
          {
            "workspaceId": workspaceId,
            "storyText": storyText,
            "status": status,
          },
        ]),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final body = jsonDecode(response.body);
        if (body['code'] == 1000) {
          return true;
        }
      }
      return false;
      return false;
    } catch (e) {
      print('Create Error: $e');
      return false;
    }
  }

  // Tạo nhiều UserStory cùng lúc
  Future<bool> createMultipleUserStories({
    required String workspaceId,
    required List<String> storyTexts,
    String status = 'ToDo',
  }) async {
    if (storyTexts.isEmpty) return true;

    final url = Uri.parse('$_baseUrl/user-stories/workspace/$workspaceId');

    try {
      final token = await AuthService.instance.getValidAccessToken();

      // Xây dựng danh sách payload
      final List<Map<String, dynamic>> payload = storyTexts
          .map(
            (text) => {
              "workspaceId": workspaceId,
              "storyText": text,
              "status": status,
            },
          )
          .toList();

      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $token',
          'x-api-key': dotenv.env['API_KEY'] ?? '',
        },
        body: jsonEncode(payload),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final body = jsonDecode(response.body);
        if (body['code'] == 1000) {
          return true;
        }
      }
      return false;
    } catch (e) {
      print('Create Multiple Error: $e');
      return false;
    }
  }
}
