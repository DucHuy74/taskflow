// lib/services/backlog/sprint_graph_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../auth/auth_service.dart';
import 'package:flutter/foundation.dart';
import 'dart:io';

class SprintGraphService {
  Future<Map<String, dynamic>?> fetchSprintGraph(String sprintId) async {
    final token = await AuthService.instance.getValidAccessToken();

    String baseUrl;
    if (kIsWeb) {
      baseUrl = 'http://localhost:8080';
    } else if (Platform.isAndroid) {
      baseUrl = 'http://10.0.2.2:8080';
    } else {
      baseUrl = 'http://localhost:8080';
    }

    // ĐƯỜNG DẪN MỚI CỦA BẠN (REST GET)
    final url = Uri.parse('$baseUrl/api/graph/sprint/$sprintId');
    
    print("Connecting to Graph API: $url");

    try {
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $token',
          'x-api-key': dotenv.env['API_KEY'] ?? '',
          'Access-Control-Allow-Origin': '*',
        },
      );

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        print("Graph Data Response: $body");

        if (body['code'] == 1000 && body['result'] != null) {
          if (body['result']['sprintGraph'] != null) {
            return body['result']['sprintGraph'];
          }
          return body['result']; 
        } 
        
        else if (body['sprintGraph'] != null) {
          return body['sprintGraph'];
        } 
        
        return body; 
        
      } else {
        print("Graph Error: ${response.statusCode} - ${response.body}");
        return null;
      }
    } catch (e) {
      print("Exception fetchSprintGraph: $e");
      return null;
    }
  }
}