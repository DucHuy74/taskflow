// lib/components/home/backlog_graph_screen.dart
import 'dart:math';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/backlog/graph_model.dart';
import '../../viewmodels/backlog/graph_view_model.dart';
import 'theme/graph_theme.dart';
import 'painters/graph_painters.dart';
import 'widgets/graph_legend.dart';
import 'widgets/start_sprint_panel.dart';
import 'widgets/node_tooltip.dart';
import 'widgets/graph_node_widgets.dart';
import '../../services/home/workspace_service.dart';


// =============================================================================
// CLASS WRAPPER: BỌC PROVIDER
// =============================================================================
class BacklogGraphScreen extends StatelessWidget {
  final String workspaceId;
  final String backlogId;
  final String backlogName;

  const BacklogGraphScreen({
    Key? key,
    required this.workspaceId,
    required this.backlogId,
    required this.backlogName,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => GraphViewModel(),
      child: _BacklogGraphScreenContent(
        workspaceId: workspaceId,
        backlogId: backlogId,
        backlogName: backlogName,
      ),
    );
  }
}

// =============================================================================
// CLASS VIEW CONTENT
// =============================================================================
class _BacklogGraphScreenContent extends StatefulWidget {
  final String workspaceId;
  final String backlogId;
  final String backlogName;

  const _BacklogGraphScreenContent({
    Key? key,
    required this.workspaceId,
    required this.backlogId,
    required this.backlogName,
  }) : super(key: key);

  @override
  _BacklogGraphScreenContentState createState() =>
      _BacklogGraphScreenContentState();
}

class _BacklogGraphScreenContentState extends State<_BacklogGraphScreenContent>
    with SingleTickerProviderStateMixin {
  Map<String, Offset> nodePositions = {};
  Set<String> edges = {};

  Set<String> expandedSubjects = {};
  Set<String> zonedSubjects = {};
  bool _isZoningMode = false;
  String? _hoveredNodeKey;

  // --- LASSO SELECTION STATE ---
  bool _isLassoMode = false;
  List<Offset> _drawnPoints = [];
  Set<String> _selectedNodeKeys = {};

  late AnimationController _spinController;

  GraphTheme get theme => GraphTheme.of(context);

  @override
  void initState() {
    super.initState();
    _spinController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  @override
  void dispose() {
    _spinController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    final vm = context.read<GraphViewModel>();
    await vm.fetchGraphData(widget.workspaceId, widget.backlogId);

    if (mounted && vm.stories.isNotEmpty) {
      setState(() {
        expandedSubjects.addAll(_getUniqueSubjects(vm.stories));
        _calculateLayout(vm.stories);
      });
    }
  }

  List<String> _getUniqueSubjects(List<AnalyzedStory> stories) {
    List<String> subjects = [];
    for (var s in stories) {
      if (!subjects.contains(s.subject)) subjects.add(s.subject);
    }
    return subjects;
  }

  bool _isObjectASubject(String objectName, List<AnalyzedStory> stories) {
    return _getUniqueSubjects(stories).contains(objectName);
  }

  String _makeObjectKey(String name) => "obj_$name";

  void _calculateLayout(List<AnalyzedStory> stories) {
    nodePositions.clear();
    edges.clear();

    List<String> subjects = _getUniqueSubjects(stories);
    const double subjectX = 150;
    const double verbX = 420;
    const double objectX = 720;

    double currentSubjectY = 140;
    const double spacing = 120;

    for (var subName in subjects) {
      nodePositions["sub_$subName"] = Offset(subjectX, currentSubjectY);
      currentSubjectY += spacing;
    }

    Set<String> uniqueVerbs = {};
    Set<String> uniqueObjects = {};

    for (var story in stories) {
      if (!expandedSubjects.contains(story.subject)) continue;

      String subKey = "sub_${story.subject}";
      String verbKey = "verb_${story.verb}";

      String targetKey = _isObjectASubject(story.object, stories)
          ? "sub_${story.object}"
          : _makeObjectKey(story.object);

      uniqueVerbs.add(verbKey);
      if (!targetKey.startsWith("sub_")) {
        uniqueObjects.add(targetKey);
      }

      edges.add("$subKey|$verbKey");
      edges.add("$verbKey|$targetKey");
    }

    double currentVerbY = 140;
    for (var verbKey in uniqueVerbs) {
      nodePositions[verbKey] = Offset(verbX, currentVerbY);
      currentVerbY += spacing;
    }

    double currentObjY = 140;
    for (var objKey in uniqueObjects) {
      nodePositions[objKey] = Offset(objectX, currentObjY);
      currentObjY += spacing;
    }
  }

  void _avoidCollision(String movedKey, Offset newPos) {
    const minDist = 70.0;
    nodePositions[movedKey] = newPos;
    for (var key in nodePositions.keys) {
      if (key == movedKey) continue;
      final other = nodePositions[key]!;
      final dist = (newPos - other).distance;
      if (dist < minDist && dist > 0) {
        final push = (other - newPos) / dist * (minDist - dist) * 0.5;
        nodePositions[key] = other + push;
      }
    }
  }

  int _countStoriesForObject(String objectName, List<AnalyzedStory> stories) {
    return stories.where((s) => s.object == objectName).length;
  }

  // --- TRUY VẾT HIGHLIGHT TOÀN BỘ S-V-O ---
  Set<String> _getHighlightedEdges(List<AnalyzedStory> stories) {
    if (_hoveredNodeKey == null) return {};
    Set<String> highlighted = {};

    for (var story in stories) {
      if (!expandedSubjects.contains(story.subject)) continue;

      String subKey = "sub_${story.subject}";
      String verbKey = "verb_${story.verb}";
      String targetKey = _isObjectASubject(story.object, stories)
          ? "sub_${story.object}"
          : _makeObjectKey(story.object);

      // Nếu Node đang hover nằm trong Story này, highlight TOÀN BỘ dây của Story đó
      if (_hoveredNodeKey == subKey ||
          _hoveredNodeKey == verbKey ||
          _hoveredNodeKey == targetKey) {
        highlighted.add("$subKey|$verbKey");
        highlighted.add("$verbKey|$targetKey");
      }
    }
    return highlighted;
  }

  // --- LASSO GESTURE HANDLERS ---
  void _onLassoPanStart(DragStartDetails details) {
    setState(() {
      _drawnPoints = [details.localPosition];
      _selectedNodeKeys.clear();
    });
  }

  void _onLassoPanUpdate(DragUpdateDetails details) {
    setState(() {
      _drawnPoints.add(details.localPosition);
    });
  }

  void _onLassoPanEnd(DragEndDetails details) {
    setState(() {
      if (_drawnPoints.length > 2) {
        Path selectionPath = Path()..addPolygon(_drawnPoints, true);
        nodePositions.forEach((key, pos) {
          if (selectionPath.contains(pos)) {
            _selectedNodeKeys.add(key);
          }
        });
      }
      _drawnPoints.clear();
      _isLassoMode = false;
    });
  }

  int get _selectedVerbsCount {
    return _selectedNodeKeys.where((k) => k.startsWith('verb_')).length;
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<GraphViewModel>();

    // Lấy danh sách các dây cần highlight dựa trên Story thực tế
    Set<String> highlightedEdges = _getHighlightedEdges(vm.stories);

    return Scaffold(
      backgroundColor: theme.bgColor,
      appBar: AppBar(
        title: Text(
          widget.backlogName.isNotEmpty ? widget.backlogName : "Backlog Graph",
          style: TextStyle(
            color: theme.textPrimary,
            fontSize: 16,
            letterSpacing: 1.2,
          ),
        ),
        backgroundColor: theme.panelBg,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: theme.panelBorder, height: 1),
        ),
      ),
      floatingActionButton: _buildFab(vm.stories),
      body: vm.isLoading
          ? Center(child: CircularProgressIndicator(color: theme.subjectBorder))
          : vm.errorMessage != null
          ? Center(
              child: Text(
                vm.errorMessage!,
                style: const TextStyle(color: Colors.redAccent, fontSize: 16),
              ),
            )
          : Stack(
              children: [
                InteractiveViewer(
                  panEnabled: !_isLassoMode,
                  scaleEnabled: !_isLassoMode,
                  constrained: false,
                  boundaryMargin: const EdgeInsets.all(2000),
                  minScale: 0.1,
                  maxScale: 4.0,
                  child: GestureDetector(
                    onPanStart: _isLassoMode ? _onLassoPanStart : null,
                    onPanUpdate: _isLassoMode ? _onLassoPanUpdate : null,
                    onPanEnd: _isLassoMode ? _onLassoPanEnd : null,
                    child: SizedBox(
                      width: 2500,
                      height: 2500,
                      child: Stack(
                        children: [
                          AnimatedBuilder(
                            animation: _spinController,
                            builder: (_, __) => CustomPaint(
                              size: const Size(2500, 2500),
                              painter: GraphLinesPainter(
                                nodePositions: nodePositions,
                                edges: edges,
                                highlightedEdges:
                                    highlightedEdges, // Chuyền vào đây
                                theme: theme,
                              ),
                            ),
                          ),
                          CustomPaint(
                            size: const Size(2500, 2500),
                            painter: ZoningPainter(
                              nodePositions: nodePositions,
                              zonedSubjects: zonedSubjects,
                              mockData: vm.stories,
                              isObjectASubject: (obj) =>
                                  _isObjectASubject(obj, vm.stories),
                              makeObjectKey: _makeObjectKey,
                              theme: theme,
                            ),
                          ),
                          if (_isLassoMode && _drawnPoints.isNotEmpty)
                            CustomPaint(
                              size: const Size(2500, 2500),
                              painter: LassoPainter(
                                drawnPoints: _drawnPoints,
                                theme: theme,
                              ),
                            ),
                          ..._buildNodeWidgets(vm.stories),
                        ],
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: 16, right: 16,
                  child: GraphLegend(stories: vm.stories, theme: theme, uniqueSubjects: _getUniqueSubjects(vm.stories)),
                ),

                // --- START SPRINT PANEL ---
                if (_selectedNodeKeys.isNotEmpty)
                  Positioned(
                    bottom: 32,
                    left: 0,
                    right: 0,
                    child: Center(
                      child: StartSprintPanel(
                        selectedNodesCount: _selectedNodeKeys.length,
                        selectedVerbsCount: _selectedVerbsCount,
                        theme: theme,
                        onStartSprint: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Bắt đầu Sprint với các hành động đã chọn!')),
                          );
                          setState(() => _selectedNodeKeys.clear());
                        },
                        onClose: () => setState(() => _selectedNodeKeys.clear()),
                      ),
                    ),
                  ),
              ],
            ),
    );
  }

      List<Widget> _buildNodeWidgets(List<AnalyzedStory> stories) {
    List<Widget> widgets = [];
    Set<String> renderedKeys = {};

    AnalyzedStory? findRepresentativeStory(String text, bool isVerb) {
      try {
        return stories.firstWhere(
          (s) => isVerb ? s.verb == text : s.object == text,
        );
      } catch (e) {
        return null;
      }
    }

    for (var key in nodePositions.keys) {
      if (renderedKeys.contains(key)) continue;
      renderedKeys.add(key);

      if (key.startsWith("sub_")) {
        String name = key.replaceFirst("sub_", "");
        widgets.add(_buildNode(key, name, NodeType.subject, null, stories));
      } else if (key.startsWith("verb_")) {
        String name = key.replaceFirst("verb_", "");
        AnalyzedStory? repStory = findRepresentativeStory(name, true);
        widgets.add(_buildNode(key, name, NodeType.verb, repStory, stories));
      } else if (key.startsWith("obj_")) {
        String name = key.replaceFirst("obj_", "");
        AnalyzedStory? repStory = findRepresentativeStory(name, false);
        widgets.add(_buildNode(key, name, NodeType.object, repStory, stories));
      }
    }

    return widgets;
  }

  Widget _buildNode(
    String key,
    String text,
    NodeType type,
    AnalyzedStory? story,
    List<AnalyzedStory> stories,
  ) {
    Offset pos = nodePositions[key]!;
    double width = type == NodeType.verb ? 64 : 110;
    double height = type == NodeType.verb
        ? 64
        : (type == NodeType.subject ? 60 : 44);

    bool isHovered = _hoveredNodeKey == key;
    bool isSelected = _selectedNodeKeys.contains(key);
    int storyCount = type == NodeType.object
        ? _countStoriesForObject(text, stories)
        : 0;

    return Positioned(
      left: pos.dx - width / 2,
      top: pos.dy - height / 2 - (type == NodeType.verb ? 12 : 0),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          MouseRegion(
            cursor: _isLassoMode
                ? SystemMouseCursors.precise
                : SystemMouseCursors.move,
            onEnter: (_) => setState(() => _hoveredNodeKey = key),
            onExit: (_) => setState(() => _hoveredNodeKey = null),
            child: GestureDetector(
              onPanUpdate: (d) {
                if (!_isZoningMode && !_isLassoMode) {
                  setState(() => _avoidCollision(key, pos + d.delta));
                }
              },
              onTap: () {
                if (_isLassoMode) {
                  setState(() {
                    if (_selectedNodeKeys.contains(key)) {
                      _selectedNodeKeys.remove(key);
                    } else {
                      _selectedNodeKeys.add(key);
                    }
                  });
                } else {
                  _handleTap(key, text, type, story, stories);
                }
              },
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  type == NodeType.subject 
                      ? GraphNodeWidgets.buildSubjectNode(text, width, height, isHovered, isSelected, theme)
                      : type == NodeType.verb 
                          ? GraphNodeWidgets.buildVerbNode(text, width, height, isHovered, isSelected, theme, _spinController)
                          : GraphNodeWidgets.buildObjectNode(text, story, width, height, isHovered, isSelected, theme),
                  if (isHovered && type == NodeType.object)
                    Positioned(
                      left: width + 8,
                      top: 0,
                      child: NodeTooltip(objectName: text, count: storyCount, theme: theme),
                    ),
                ],
              ),
            ),
          ),
          if (type == NodeType.verb)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                'expand',
                style: TextStyle(
                  color: theme.textSecondary.withOpacity(0.7),
                  fontSize: 9,
                  letterSpacing: 0.5,
                ),
              ),
            ),
        ],
      ),
    );
  }

  void _handleTap(
    String key,
    String text,
    NodeType type,
    AnalyzedStory? story,
    List<AnalyzedStory> stories,
  ) {
    if (_isZoningMode && type == NodeType.subject) {
      setState(() {
        if (zonedSubjects.contains(text)) {
          zonedSubjects.remove(text);
        } else {
          zonedSubjects.add(text);
        }
      });
    } else if (type == NodeType.subject && !_isZoningMode) {
      setState(() {
        if (expandedSubjects.contains(text)) {
          expandedSubjects.remove(text);
        } else {
          expandedSubjects.add(text);
        }
        _calculateLayout(stories);
      });
    } else if (type == NodeType.object && story != null) {
      _showActionMenu(context, story);
    }
  }

  Widget _buildFab(List<AnalyzedStory> stories) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        _fabButton(
          heroTag: "lasso",
          icon: Icons.gesture,
          active: _isLassoMode,
          onPressed: () => setState(() {
            _isLassoMode = !_isLassoMode;
            if (!_isLassoMode) _drawnPoints.clear();
          }),
        ),
        const SizedBox(height: 10),
        _fabButton(
          heroTag: "z",
          icon: Icons.ads_click,
          active: _isZoningMode,
          onPressed: () => setState(() => _isZoningMode = !_isZoningMode),
        ),
        const SizedBox(height: 10),
        _fabButton(
          heroTag: "expand",
          icon: expandedSubjects.isEmpty
              ? Icons.unfold_more
              : Icons.unfold_less,
          onPressed: () => setState(() {
            if (expandedSubjects.length == _getUniqueSubjects(stories).length) {
              expandedSubjects.clear();
            } else {
              expandedSubjects.addAll(_getUniqueSubjects(stories));
            }
            _calculateLayout(stories);
          }),
        ),
        const SizedBox(height: 10),
        _fabButton(
          heroTag: "r",
          icon: Icons.refresh,
          onPressed: () async {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Đang kích hoạt rebuild graph...')),
            );
            final success = await WorkspaceService().rebuildGraph(widget.workspaceId);
            if (success) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text('Rebuild graph thành công!'),
                    backgroundColor: theme.doneColor,
                  ),
                );
                _loadData();
              }
            } else {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Rebuild graph thất bại!'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            }
          },
        ),
      ],
    );
  }

  Widget _fabButton({
    required String heroTag,
    required IconData icon,
    required VoidCallback onPressed,
    bool active = false,
  }) {
    return FloatingActionButton(
      heroTag: heroTag,
      mini: true,
      backgroundColor: active ? theme.verbBorder : theme.panelBg,
      elevation: 4,
      onPressed: onPressed,
      child: Icon(
        icon,
        color: active ? Colors.white : theme.textPrimary,
        size: 20,
      ),
    );
  }

  void _showActionMenu(BuildContext context, AnalyzedStory story) {
    showModalBottomSheet(
      context: context,
      backgroundColor: theme.panelBg,
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
        side: BorderSide(color: theme.panelBorder),
      ),
      builder: (c) => Container(
        height: 180,
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              story.rawText,
              style: TextStyle(
                color: theme.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _statusChip(story.status),
                const SizedBox(width: 12),
                Text(
                  '${story.subject} → ${story.verb} → ${story.object}',
                  style: TextStyle(color: theme.textSecondary, fontSize: 13),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'ID: ${story.id}',
              style: TextStyle(color: theme.textSecondary, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  Widget _statusChip(USStatus status) {
    Color color = status == USStatus.done
        ? theme.doneColor
        : (status == USStatus.inProgress
              ? theme.inProgressColor
              : theme.textSecondary);
    String label = status == USStatus.done
        ? 'Done'
        : (status == USStatus.inProgress ? 'In Progress' : 'Todo');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.6)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

