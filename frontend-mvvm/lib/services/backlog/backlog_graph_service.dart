// lib/services/graph/graph_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../auth/auth_service.dart';
import '../../mockdata/backlog/graph_dataset.dart';

import 'package:flutter_dotenv/flutter_dotenv.dart';

class GraphService {
  static String get _baseUrl =>
      dotenv.env['BASE_URL'] ?? 'http://localhost:8080/api';

  Future<Map<String, dynamic>?> getBacklogGraph(
    String workspaceId,
    String backlogId, {
    String source = 'REALTIME',
  }) async {
    final url = Uri.parse('$_baseUrl/graphql');
    final token = await AuthService.instance.getValidAccessToken();

    final boolStr = source == 'BATCH' ? 'true' : 'null';

    final useMock = dotenv.env['USE_MOCK'] == 'true';
    if (useMock) {
      await Future.delayed(const Duration(seconds: 1));
      return GraphDataset.mockWorkspaceGraph;
    }

    final query =
        '''
      query WorkspaceGraph(\$workspaceId: ID!, \$backlogId: ID) {
          workspaceGraph(
              workspaceId: \$workspaceId
              includeSimilarity: $boolStr
              includeAssociation: $boolStr
              minScore: 0.5
              minConfidence: 0.3
              sprintId: null
              backlogId: \$backlogId
              source: "$source"
          ) {
              nodes {
                  id
                  label
                  type
                  priority
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
            'backlogId': null, // Force null to match friend's Postman
          },
        }),
      );

      print('Graph API Response Status: ${response.statusCode}');

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final body = jsonDecode(response.body);
        print('DEBUG GraphQL Response: $body');
        if (body['errors'] != null) {
          print('GraphQL Errors: ${body['errors']}');
        }
        if (body['data'] != null && body['data']['workspaceGraph'] != null) {
          return body['data']['workspaceGraph'];
        }
        return null;
      } else {
        print(
          'Lỗi gọi Graph API: Status ${response.statusCode} - ${response.body}',
        );
        return null;
      }
    } catch (e) {
      print('Exception fetching graph: $e');
      return null;
    }
  }

  Future<List<dynamic>?> getBacklogUserStories(
    String workspaceId,
    String backlogId,
  ) async {
    try {
      final token = await AuthService.instance.getValidAccessToken();
      // Dùng backlogId làm query param nếu có (không rỗng)
      final baseUrl = '$_baseUrl/user-stories/workspace/$workspaceId/backlog';
      final url = backlogId.isNotEmpty
          ? Uri.parse('$baseUrl?backlogId=$backlogId')
          : Uri.parse(baseUrl);

      print('DEBUG UserStories URL: $url');

      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      print('DEBUG UserStories Status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final data = json.decode(utf8.decode(response.bodyBytes));
        final list = data['result'] as List<dynamic>?;
        print('DEBUG UserStories Count: ${list?.length ?? 0}');
        if (list != null && list.isNotEmpty) {
          print(
            'DEBUG First story ID: ${list.first['id']} | text: ${list.first['storyText']}',
          );
        }
        return list;
      }
      print(
        'DEBUG UserStories Error body: ${response.body.substring(0, response.body.length.clamp(0, 200))}',
      );
      return null;
    } catch (e) {
      print('REST Error: $e');
      return null;
    }
  }
}
