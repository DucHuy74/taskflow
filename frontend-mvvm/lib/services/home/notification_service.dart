import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../auth/auth_service.dart';
import '../../models/home/notification_model.dart';

class NotificationService {
  static const String _baseUrl = 'http://localhost:8080/api';

  // 1. Lấy danh sách thông báo chưa đọc
  Future<List<NotificationModel>> getUnreadNotifications() async {
    final url = Uri.parse('$_baseUrl/notifications/unread');
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
        final data = jsonDecode(response.body);
        if (data['code'] == 1000 && data['result'] != null) {
          final List<dynamic> resultList = data['result'];
          return resultList.map((e) => NotificationModel.fromJson(e)).toList();
        }
      }
      return [];
    } catch (e) {
      print('Error fetching notifications: $e');
      return [];
    }
  }

  // 2. Đánh dấu 1 thông báo là đã đọc (PATCH)
  Future<bool> markAsRead(String notificationId) async {
    final url = Uri.parse('$_baseUrl/notifications/$notificationId/read');
    final token = await AuthService.instance.getValidAccessToken();

    try {
      final response = await http.patch(
        url,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $token',
          'x-api-key': dotenv.env['API_KEY'] ?? '',
        },
      );
      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (e) {
      print('Error marking notification as read: $e');
      return false;
    }
  }

  // 3. Đánh dấu tất cả thông báo là đã đọc (PATCH)
  Future<bool> markAllAsRead() async {
    final url = Uri.parse('$_baseUrl/notifications/read-all');
    final token = await AuthService.instance.getValidAccessToken();

    try {
      final response = await http.patch(
        url,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $token',
          'x-api-key': dotenv.env['API_KEY'] ?? '',
        },
      );
      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (e) {
      print('Error marking all as read: $e');
      return false;
    }
  }
}