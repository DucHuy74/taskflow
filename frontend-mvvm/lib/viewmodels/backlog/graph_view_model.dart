// lib/viewmodels/backlog/graph_view_model.dart
import 'package:flutter/material.dart';
import '../../models/backlog/graph_model.dart';
import '../../services/backlog/backlog_graph_service.dart';

class GraphViewModel extends ChangeNotifier {
  final GraphService _service = GraphService();

  bool isLoading = true;
  String? errorMessage;
  List<AnalyzedStory> stories = [];

  Future<void> fetchGraphData(String backlogId) async {
    isLoading = true;
    errorMessage = null;
    notifyListeners();

    try {
      final data = await _service.getBacklogGraph(backlogId);
      if (data != null) {
        _parseGraphToStories(data);
      } else {
        errorMessage = "Failed to load graph data.";
      }
    } catch (e) {
      errorMessage = "Error connecting to server: $e";
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  void _parseGraphToStories(Map<String, dynamic> data) {
    final nodes = data['nodes'] as List<dynamic>? ?? [];
    final edges = data['edges'] as List<dynamic>? ?? [];

    List<AnalyzedStory> fetchedStories = [];
    final userStoryNodes = nodes.where((n) => n['type'] == 'UserStory');

    for (var usNode in userStoryNodes) {
      String usId = usNode['id']?.toString() ?? '';
      String usLabel = usNode['label']?.toString() ?? '';
      
      String actor = 'Unknown';
      String action = 'Unknown';
      String target = 'Unknown';

      var relatedEdges = edges.where((e) => e['from'] == usId || e['from'] == usLabel);

      for (var edge in relatedEdges) {
        String toRef = edge['to'].toString();
        String edgeType = edge['type'].toString();

        var targetNode = nodes.firstWhere(
            (n) => n['id'] == toRef || n['label'] == toRef,
            orElse: () => null,
        );

        if (targetNode != null) {
          String label = targetNode['label']?.toString() ?? 'Unknown';
          if (edgeType == 'HAS_ACTOR') actor = label;
          if (edgeType == 'PERFORMS') action = label;
          if (edgeType == 'TARGETS') target = label;
        }
      }

      fetchedStories.add(AnalyzedStory(
        id: usId.isNotEmpty && usId != "null" ? usId : usLabel,
        rawText: "$actor $action $target",
        subject: actor,
        verb: action,
        object: target,
        status: USStatus.todo,
      ));
    }

    stories = fetchedStories;
  }
}