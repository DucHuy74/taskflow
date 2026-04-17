import 'package:frontend/services/auth/auth_service.dart';
import 'package:http/http.dart' as http;

class ApiClient {
  static final ApiClient instance = ApiClient._internal();
  ApiClient._internal();

  Future<http.Response> get(String url) async {
    final token = await AuthService.instance.getValidAccessToken();

    if (token == null) {
      throw Exception('Unauthenticated');
    }

    final res = await http.get(
      Uri.parse(url),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    // Token hết hạn / sai
    if (res.statusCode == 401) {
      await AuthService.instance.logout();
    }

    return res;
  }

  Future<http.Response> post(String url, {Object? body}) async {
    final token = await AuthService.instance.getValidAccessToken();

    if (token == null) {
      throw Exception('Unauthenticated');
    }

    return http.post(
      Uri.parse(url),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: body,
    );
  }
}
