import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../auth/auth_service.dart';
import '../../models/backlog/sprint_model.dart'; 
import '../../models/backlog/user_story_model.dart';

class SprintService {
  static const String _baseUrl = 'http://localhost:8080/api';

  // --- Lấy danh sách Sprint ---
  Future<List<SprintModel>> getSprints(String workspaceId) async {
    final url = Uri.parse('$_baseUrl/sprints/workspace/$workspaceId');

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
          return list.map((e) => SprintModel.fromJson(e)).toList();
        }
      }
      
      print('Get Sprints Error: ${response.statusCode} - ${response.body}');
      return [];

    } catch (e) {
      print('Exception Get Sprints: $e');
      return [];
    }
  }
  
  // --- Tạo Sprint ---
  Future<bool> createSprint({
    required String workspaceId,
    required String name,
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    final url = Uri.parse('$_baseUrl/sprints/workspace/$workspaceId');

    try {
      final token = await AuthService.instance.getValidAccessToken();
      
      String formatDate(DateTime date) {
        return "${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";
      }

      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $token',
          'x-api-key': dotenv.env['API_KEY'] ?? '',
        },
        body: jsonEncode({
          "name": name,
          "startDate": formatDate(startDate),
          "endDate": formatDate(endDate)
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final body = jsonDecode(response.body);
        if (body['code'] == 1000) {
          return true;
        }
      }
      print('Create Sprint Error: ${response.body}');
      return false;
    } catch (e) {
      print('Exception: $e');
      return false;
    }
  }

  // --- Thêm User Story vào Sprint ---
  Future<bool> addStoryToSprint({
    required String sprintId,
    required String userStoryId,
  }) async {
    final url = Uri.parse('$_baseUrl/sprints/$sprintId/user-stories/$userStoryId');

    try {
      final token = await AuthService.instance.getValidAccessToken();

      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $token',
          'x-api-key': dotenv.env['API_KEY'] ?? '',
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final body = jsonDecode(response.body);
        if (body['code'] == 1000) {
           return true;
        }
      }
      
      print('Add Story Error: ${response.statusCode} - ${response.body}');
      return false;
    } catch (e) {
      print('Exception Add Story: $e');
      return false;
    }
  }

  // --- Lấy danh sách User Stories trong Sprint ---
  Future<List<UserStoryModel>> getStoriesInSprint(String sprintId) async {
    final url = Uri.parse('$_baseUrl/sprints/$sprintId/user-stories');

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
      print('Exception Get Sprint Stories: $e');
      return [];
    }
  }

  // --- Start Sprint ---
  Future<bool> startSprint(String sprintId) async {
    final url = Uri.parse('$_baseUrl/sprints/$sprintId/start');

    try {
      final token = await AuthService.instance.getValidAccessToken();
      
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $token',
          'x-api-key': dotenv.env['API_KEY'] ?? '',
        },
      );

      // Kiểm tra thành công (200 OK)
      if (response.statusCode == 200) {
        return true;
      } else {
        print('Start Sprint Error: ${response.body}');
        return false;
      }
    } catch (e) {
      print('Exception Start Sprint: $e');
      return false;
    }
  }

  // --- Complete Sprint ---
  Future<bool> completeSprint(String sprintId) async {
    final url = Uri.parse('$_baseUrl/sprints/$sprintId/complete');

    try {
      final token = await AuthService.instance.getValidAccessToken();
      
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $token',
          'x-api-key': dotenv.env['API_KEY'] ?? '',
        },
      );

      // Kiểm tra thành công
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['code'] == 1000) {
           return true;
        } else {
           print('Complete Sprint Failed: Code is not 1000. Response: ${response.body}');
           return false;
        }
      } else {
        print('Complete Sprint Error: Status ${response.statusCode} - ${response.body}');
        return false;
      }
    } catch (e) {
      print('Exception Complete Sprint: $e');
      return false;
    }
  }
}