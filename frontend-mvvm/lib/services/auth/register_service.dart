import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class RegisterService {
  static Future<http.Response> register(Map<String, dynamic> body) async {
    final url = Uri.parse('${dotenv.env['BASE_URL']}api/register');

    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': dotenv.env['API_KEY'] ?? '',
      },
      body: jsonEncode(body),
    );

    return response;
  }
}
