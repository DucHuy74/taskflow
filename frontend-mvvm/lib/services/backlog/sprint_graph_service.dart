// lib/services/backlog/sprint_graph_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../auth/auth_service.dart';
import 'package:flutter/foundation.dart';
import 'dart:io';

class SprintGraphService {
  Future<Map<String, dynamic>?> fetchSprintGraph(String workspaceId, String backlogId, String? sprintId) async {
    final token = await AuthService.instance.getValidAccessToken();

    String baseUrl;
    if (kIsWeb) {
      baseUrl = 'http://localhost:8080';
    } else if (Platform.isAndroid) {
      baseUrl = 'http://10.0.2.2:8080';
    } else {
      baseUrl = 'http://localhost:8080';
    }

    final url = Uri.parse('$baseUrl/api/graphql');
    
    print("Connecting to Graph API: \$url");

    final query = '''
      query WorkspaceGraph(\$workspaceId: String, \$backlogId: String, \$sprintId: String) {
          workspaceGraph(
              workspaceId: \$workspaceId
              includeSimilarity: null
              includeAssociation: null
              minScore: 0.5
              minConfidence: 0.3
              sprintId: \$sprintId
              backlogId: \$backlogId
              source: "REALTIME"
          ) {
              nodes {
                  id
                  label
                  type
              }
              edges {
                  from
                  to
                  type
                  score
                  confidence
                  lift
              }
          }
      }
    ''';

    try {
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $token',
          'x-api-key': dotenv.env['API_KEY'] ?? '',
          'Access-Control-Allow-Origin': '*',
        },
        body: jsonEncode({
          'query': query,
          'variables': {
            'workspaceId': workspaceId,
            'backlogId': backlogId,
            'sprintId': sprintId,
          }
        }),
      );

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['data'] != null && body['data']['workspaceGraph'] != null) {
           return body['data']['workspaceGraph'];
        }
        return body;
      } else {
        print("Graph Error: ${response.statusCode} - ${response.body}");
        return null;
      }
    } catch (e) {
      print("Exception fetchSprintGraph: \$e");
      return null;
    }
  }
}