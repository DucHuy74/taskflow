import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../auth/auth_service.dart';
import 'package:flutter/foundation.dart'; // Để check kIsWeb
import 'dart:io'; // Để check Platform

class SprintGraphService {
  Future<GraphQLClient> _getClient() async {
    final token = await AuthService.instance.getValidAccessToken();
    
    String url;
    if (kIsWeb) {
      url = 'http://localhost:8080/api/graphql';
    } else if (Platform.isAndroid) {
      url = 'http://localhost:8080/api/graphql'; 
    } else {
      url = 'http://localhost:8080/api/graphql'; 
    }

    print("Connecting to Graph API: $url");

    final HttpLink httpLink = HttpLink(
      url,
      defaultHeaders: {
        'Authorization': 'Bearer $token',
        'x-api-key': dotenv.env['API_KEY'] ?? '',
        'Access-Control-Allow-Origin': '*',
      },
    );

    return GraphQLClient(cache: GraphQLCache(), link: httpLink);
  }

  Future<Map<String, dynamic>?> fetchSprintGraph(String sprintId) async {
    final client = await _getClient();

    const String query = r'''
      query getSprintGraph($id: ID!) {
        sprintGraph(sprintId: $id) {
          nodes { id type }
          edges { from to type }
        }
      }
    ''';
    final QueryOptions options = QueryOptions(
      document: gql(query),
      variables: {'id': sprintId},
      fetchPolicy: FetchPolicy.networkOnly,
    );

    final result = await client.query(options);

    if (result.hasException) {
      print("Graph Error: ${result.exception.toString()}");
      return null;
    }

    print("Graph Data: ${result.data?['sprintGraph']}");

    return result.data?['sprintGraph'];
  }
}
