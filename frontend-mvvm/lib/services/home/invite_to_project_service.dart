import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../auth/auth_service.dart';
import '../../models/home/invitation_model.dart';

class InvitationService {
  static const String _baseUrl = 'http://localhost:8080/api'; 

  // [MỚI] Thêm tham số role
  Future<bool> sendInvites(String workspaceId, List<String> emails, String role) async {
    final url = Uri.parse('$_baseUrl/workspace/$workspaceId/invitations');
    final token = await AuthService.instance.getValidAccessToken();

    try {
      List<Future<http.Response>> requests = emails.map((email) {
        return http.post(
          url,
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'Authorization': 'Bearer $token',
            'x-api-key': dotenv.env['API_KEY'] ?? '',
          },
          body: jsonEncode({
            "email": email,
            "role": role 
          }),
        );
      }).toList();

      final responses = await Future.wait(requests);
      bool allSuccess = responses.every((res) => res.statusCode >= 200 && res.statusCode < 300);
      return allSuccess;
    } catch (e) {
      throw Exception('Lỗi kết nối: $e');
    }
  }

  // Chấp nhận lời mời
  Future<bool> acceptInvitation(String invitationId) async {
    final url = Uri.parse('$_baseUrl/invitations/$invitationId/accept');
    final token = await AuthService.instance.getValidAccessToken();

    try {
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $token',
          'x-api-key': dotenv.env['API_KEY'] ?? '',
        },
      );
      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (e) {
      print('Lỗi kết nối accept: $e');
      return false;
    }
  }

  // Từ chối lời mời
  Future<bool> denyInvitation(String invitationId) async {
    final url = Uri.parse('$_baseUrl/invitations/$invitationId/deny');
    final token = await AuthService.instance.getValidAccessToken();

    try {
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $token',
          'x-api-key': dotenv.env['API_KEY'] ?? '',
        },
      );
      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (e) {
      print('Lỗi kết nối deny: $e');
      return false;
    }
  }

  // Lấy danh sách lời mời đang chờ
  Future<List<InvitationModel>> getPendingInvitations() async {
    final url = Uri.parse('$_baseUrl/invitations/pending');
    final token = await AuthService.instance.getValidAccessToken();

    try {
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $token',
          'x-api-key': dotenv.env['API_KEY'] ?? '',
        },
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => InvitationModel.fromJson(json)).toList();
      } else {
        return [];
      }
    } catch (e) {
      print('Lỗi lấy pending invitations: $e');
      return [];
    }
  }
}