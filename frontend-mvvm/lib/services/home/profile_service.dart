import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../auth/auth_service.dart'; 
import '../../models/home/user_profile_model.dart'; 

class ProfileService {
  static const String _baseUrl = 'http://localhost:8080/api';

  Future<UserProfile> fetchUserProfile() async {
    final url = Uri.parse('$_baseUrl/my-profile');
    
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
        final Map<String, dynamic> data = jsonDecode(response.body);
        if (data['code'] == 1000 && data['result'] != null) {
          return UserProfile.fromJson(data['result']);
        } else {
          throw Exception('Lỗi từ server: ${data['code']}');
        }
      } else {
        throw Exception('Lỗi kết nối: HTTP ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Không thể tải profile: $e');
    }
  }
}