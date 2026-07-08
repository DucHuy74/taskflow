// lib/viewmodels/backlog/graph_view_model.dart
import 'package:flutter/material.dart';
import '../../models/backlog/graph_model.dart';
import '../../services/backlog/backlog_graph_service.dart';

class GraphViewModel extends ChangeNotifier {
  final GraphService _service = GraphService();

  bool isLoading = true;
  String? errorMessage;
  List<AnalyzedStory> stories = [];

  /// Map từ termId (= label của TERM node, ví dụ "customer", "want", "account")
  /// → priority tối đa (sau khi đã propagate từ USER_STORY qua PERFORM/TARGET)
  Map<String, double> termPriorities = {};

  /// Map UUID → câu story gốc từ REST API
  Map<String, String> userStoryTexts = {};

  Future<void> fetchGraphData(
    String workspaceId,
    String backlogId, {
    String source = 'REALTIME',
  }) async {
    isLoading = true;
    errorMessage = null;
    notifyListeners();

    print('DEBUG fetchGraphData workspaceId=$workspaceId backlogId=$backlogId');

    try {
      final results = await Future.wait([
        _service.getBacklogGraph(workspaceId, backlogId, source: source),
        _service.getBacklogUserStories(workspaceId, backlogId),
      ]);

      final data = results[0] as Map<String, dynamic>?;
      final rawList = results[1] as List<dynamic>?;
      print('DEBUG rawUserStories from REST: ${rawList?.length ?? 'NULL'}');
      final userStories = rawList ?? [];

      if (data != null) {
        _parseGraphToStories(data, userStories);
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

  void _parseGraphToStories(
    Map<String, dynamic> data,
    List<dynamic> rawUserStories,
  ) {
    final nodes = data['nodes'] as List<dynamic>? ?? [];
    final edges = data['edges'] as List<dynamic>? ?? [];

    // Tạo map user stories và lưu vào public field (từ REST API)
    userStoryTexts = {};
    for (var us in rawUserStories) {
      if (us['id'] != null && us['storyText'] != null) {
        userStoryTexts[us['id'].toString()] = us['storyText'].toString();
      }
    }
    print('DEBUG userStoryTexts loaded: ${userStoryTexts.length} entries');
    if (userStoryTexts.isNotEmpty) {
      print('DEBUG sample userStoryText key: ${userStoryTexts.keys.first}');
    }

    // Bước 1: Build nodeIdToNode trước để dùng được bên dưới
    List<AnalyzedStory> fetchedStories = [];

    // Map to quickly look up node data by ID
    Map<String, Map<String, dynamic>> nodeIdToNode = {};
    for (var node in nodes) {
      String id = node['id']?.toString() ?? '';
      if (id.isNotEmpty) {
        nodeIdToNode[id] = node as Map<String, dynamic>;
      }
    }

    // Fallback: nếu REST trả về rỗng, dùng label của USER_STORY nodes từ GraphQL
    // (một số backend trả về storyText trong label)
    if (userStoryTexts.isEmpty) {
      for (var node in nodes) {
        String type = node['type']?.toString() ?? '';
        String id = node['id']?.toString() ?? '';
        String label = node['label']?.toString() ?? '';
        if (type == 'USER_STORY' &&
            id.isNotEmpty &&
            label.isNotEmpty &&
            label != id) {
          userStoryTexts[id] = label;
        }
      }
      if (userStoryTexts.isNotEmpty) {
        print(
          'DEBUG userStoryTexts fallback from GraphQL: ${userStoryTexts.length} entries',
        );
      }
    }

    // Lấy priority từ các USER_STORY nodes truyền xuống cho TERM nodes qua liên kết RELATES_TO
    Map<String, double> nodeMaxPriority = {};
    var relatesEdges = edges.where((e) {
      String type = e['type']?.toString().toUpperCase() ?? '';
      return type == 'RELATES_TO' ||
          type == 'RELATED_TO' ||
          type == 'SIMILAR' ||
          type == 'CONTAINS' ||
          type == 'HAS' ||
          type == 'HAS_SUBJECT' ||
          type == 'HAS_VERB' ||
          type == 'HAS_OBJECT';
    });

    Map<String, Set<String>> termToUserStories = {};

    for (var edge in relatesEdges) {
      String fromId = edge['from']?.toString() ?? '';
      String toId = edge['to']?.toString() ?? '';

      // Kiểm tra cả 2 chiều (Story -> Term hoặc Term -> Story)
      double? storyPriorityFrom = (nodeIdToNode[fromId]?['priority'] as num?)
          ?.toDouble();
      double? storyPriorityTo = (nodeIdToNode[toId]?['priority'] as num?)
          ?.toDouble();

      bool fromIsStory = nodeIdToNode[fromId]?['type'] == 'USER_STORY';
      bool toIsStory = nodeIdToNode[toId]?['type'] == 'USER_STORY';

      if (fromIsStory) {
        termToUserStories.putIfAbsent(toId, () => {}).add(fromId);
        if (storyPriorityFrom != null) {
          double currentMax = nodeMaxPriority[toId] ?? 0.0;
          if (storyPriorityFrom > currentMax) {
            nodeMaxPriority[toId] = storyPriorityFrom;
          }
        }
      } else if (toIsStory) {
        termToUserStories.putIfAbsent(fromId, () => {}).add(toId);
        if (storyPriorityTo != null) {
          double currentMax = nodeMaxPriority[fromId] ?? 0.0;
          if (storyPriorityTo > currentMax) {
            nodeMaxPriority[fromId] = storyPriorityTo;
          }
        }
      }
    }

    // Truyền priority từ Subject -> Verb qua PERFORM edges
    for (var edge in edges.where((e) => e['type'] == 'PERFORM')) {
      String subjectId = edge['from']?.toString() ?? '';
      String verbId = edge['to']?.toString() ?? '';
      if (subjectId.isEmpty || verbId.isEmpty) continue;

      double? subPri =
          nodeMaxPriority[subjectId] ??
          (nodeIdToNode[subjectId]?['priority'] as num?)?.toDouble();
      if (subPri != null) {
        double currentMax = nodeMaxPriority[verbId] ?? 0.0;
        if (subPri > currentMax) {
          nodeMaxPriority[verbId] = subPri;
        }
      }
    }

    // Truyền priority từ Verb -> Object qua TARGET edges
    for (var edge in edges.where((e) => e['type'] == 'TARGET')) {
      String verbId = edge['from']?.toString() ?? '';
      String objectId = edge['to']?.toString() ?? '';
      if (verbId.isEmpty || objectId.isEmpty) continue;

      double? verbPri =
          nodeMaxPriority[verbId] ??
          (nodeIdToNode[verbId]?['priority'] as num?)?.toDouble();
      if (verbPri != null) {
        double currentMax = nodeMaxPriority[objectId] ?? 0.0;
        if (verbPri > currentMax) {
          nodeMaxPriority[objectId] = verbPri;
        }
      }
    }

    // Find all PERFORM edges (Subject -> Verb)
    var performEdges = edges.where((e) => e['type'] == 'PERFORM');

    for (var performEdge in performEdges) {
      String subjectId = performEdge['from']?.toString() ?? '';
      String verbId = performEdge['to']?.toString() ?? '';

      if (subjectId.isEmpty || verbId.isEmpty) continue;

      String subjectLabel =
          nodeIdToNode[subjectId]?['label']?.toString() ?? subjectId;
      String verbLabel = nodeIdToNode[verbId]?['label']?.toString() ?? verbId;

      double? subjectPriority =
          nodeMaxPriority[subjectId] ??
          (nodeIdToNode[subjectId]?['priority'] as num?)?.toDouble();
      double? verbPriority =
          nodeMaxPriority[verbId] ??
          (nodeIdToNode[verbId]?['priority'] as num?)?.toDouble();

      double? performScore = (performEdge['score'] as num?)?.toDouble();
      double? performConfidence = (performEdge['confidence'] as num?)
          ?.toDouble();

      Set<String> sStories = termToUserStories[subjectId] ?? {};
      Set<String> vStories = termToUserStories[verbId] ?? {};

      Set<String> svCommon = sStories.intersection(vStories);
      if (svCommon.isEmpty) {
        svCommon = sStories.isNotEmpty ? sStories : vStories;
      }

      // Find all TARGET edges starting from this verb (Verb -> Object)
      var targetEdges = edges.where(
        (e) => e['type'] == 'TARGET' && e['from']?.toString() == verbId,
      );

      if (targetEdges.isEmpty) {
        String storyId = svCommon.isNotEmpty
            ? svCommon.first
            : "${subjectId}_${verbId}";
        String rawText = userStoryTexts[storyId] ?? "$subjectLabel $verbLabel";

        fetchedStories.add(
          AnalyzedStory(
            id: storyId,
            rawText: rawText,
            subject: subjectLabel,
            verb: verbLabel,
            object: "Unknown",
            status: USStatus.todo,
            subjectPriority: subjectPriority,
            verbPriority: verbPriority,
            performScore: performScore,
            performConfidence: performConfidence,
          ),
        );
      } else {
        for (var targetEdge in targetEdges) {
          String objectId = targetEdge['to']?.toString() ?? '';
          if (objectId.isEmpty) continue;

          String objectLabel =
              nodeIdToNode[objectId]?['label']?.toString() ?? objectId;
          double? objectPriority =
              nodeMaxPriority[objectId] ??
              (nodeIdToNode[objectId]?['priority'] as num?)?.toDouble();

          double? targetScore = (targetEdge['score'] as num?)?.toDouble();
          double? targetConfidence = (targetEdge['confidence'] as num?)
              ?.toDouble();

          Set<String> oStories = termToUserStories[objectId] ?? {};
          Set<String> svoCommon = svCommon.intersection(oStories);
          if (svoCommon.isEmpty) {
            svoCommon = svCommon.isNotEmpty ? svCommon : oStories;
          }

          String storyId = svoCommon.isNotEmpty
              ? svoCommon.first
              : "${subjectId}_${verbId}_${objectId}";
          String rawText =
              userStoryTexts[storyId] ??
              "$subjectLabel $verbLabel $objectLabel";

          fetchedStories.add(
            AnalyzedStory(
              id: storyId,
              rawText: rawText,
              subject: subjectLabel,
              verb: verbLabel,
              object: objectLabel,
              status: USStatus.todo,
              subjectPriority: subjectPriority,
              verbPriority: verbPriority,
              objectPriority: objectPriority,
              performScore: performScore,
              performConfidence: performConfidence,
              targetScore: targetScore,
              targetConfidence: targetConfidence,
            ),
          );
        }
      }
    }

    stories = fetchedStories;

    // Expose termPriorities cho UI - bao gồm cả USER_STORY node priorities
    termPriorities = Map.from(nodeMaxPriority);
    // Thêm priority từ các USER_STORY nodes (dùng label làm key)
    for (var node in nodes) {
      double? p = (node['priority'] as num?)?.toDouble();
      if (p != null) {
        String id = node['id']?.toString() ?? '';
        String label = node['label']?.toString() ?? id;
        if (!termPriorities.containsKey(id) || termPriorities[id]! < p) {
          termPriorities[id] = p;
        }
        if (!termPriorities.containsKey(label) || termPriorities[label]! < p) {
          termPriorities[label] = p;
        }
      }
    }
  }
}
