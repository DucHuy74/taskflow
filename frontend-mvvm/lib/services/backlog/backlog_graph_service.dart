// lib/services/graph/graph_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../auth/auth_service.dart';

class GraphService {
  static const String _baseUrl = 'http://localhost:8080/api';

  Future<Map<String, dynamic>?> getBacklogGraph(String workspaceId, String backlogId) async {
    final url = Uri.parse('$_baseUrl/graphql');
    final token = await AuthService.instance.getValidAccessToken();

    final query = '''
      query WorkspaceGraph(\$workspaceId: String, \$backlogId: String) {
          workspaceGraph(
              workspaceId: \$workspaceId
              includeSimilarity: true
              includeAssociation: true
              minScore: 0.5
              minConfidence: 0.3
              sprintId: null
              backlogId: \$backlogId
              source: "BATCH"
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
        },
        body: jsonEncode({
          'query': query,
          'variables': {
            'workspaceId': workspaceId,
            'backlogId': backlogId,
          }
        }),
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final body = jsonDecode(response.body);
        if (body['data'] != null && body['data']['workspaceGraph'] != null) {
           return body['data']['workspaceGraph'];
        }
        return body;
      } else {
        print('Lỗi gọi Graph API: Status ${response.statusCode} - ${response.body}');
        return null;
      }
    } catch (e) {
      print('Exception fetching graph: $e');
      return null;
    }
  }
}