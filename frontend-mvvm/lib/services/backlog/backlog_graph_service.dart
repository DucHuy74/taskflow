// lib/services/graph/graph_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../auth/auth_service.dart';

class GraphService {
  static const String _baseUrl = 'http://localhost:8080/api';

  Future<Map<String, dynamic>?> getBacklogGraph(String backlogId) async {
    final url = Uri.parse('$_baseUrl/graph/backlog/$backlogId');
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
        return jsonDecode(response.body);
      } else {
        print('Lỗi gọi Graph API: Status ${response.statusCode}');
        return null;
      }
    } catch (e) {
      print('Exception fetching graph: $e');
      return null;
    }
  }
}