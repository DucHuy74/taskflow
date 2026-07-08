// lib/components/home/backlog_graph_screen.dart
import 'dart:math';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
import '../../services/backlog/userstory_service.dart';

// =============================================================================
// CLASS WRAPPER: BỌC PROVIDER
// =============================================================================
class BacklogGraphScreen extends StatefulWidget {
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
  State<BacklogGraphScreen> createState() => _BacklogGraphScreenState();
}

class _BacklogGraphScreenState extends State<BacklogGraphScreen> {
  late final GraphViewModel _viewModel;

  @override
  void initState() {
    super.initState();
    _viewModel = GraphViewModel();
  }

  @override
  void dispose() {
    _viewModel.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: _viewModel,
      child: _BacklogGraphScreenContent(
        workspaceId: widget.workspaceId,
        backlogId: widget.backlogId,
        backlogName: widget.backlogName,
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
  final ValueNotifier<Map<String, Offset>> _positionsNotifier = ValueNotifier(
    {},
  );
  Set<String> edges = {};

  Set<String> expandedSubjects = {};
  Set<String> zonedSubjects = {};
  bool _isZoningMode = false;
  String? _hoveredNodeKey;

  // --- LASSO SELECTION STATE ---
  bool _isLassoMode = false;
  List<Offset> _drawnPoints = [];
  Set<String> _selectedNodeKeys = {};

  // --- FILTER STATE (dùng ValueNotifier để tránh rebuild cả cây) ---
  final ValueNotifier<double> _priorityFilterNotifier = ValueNotifier(0.0);
  bool _showFilterSlider = false;

  // Cache: priority tối đa theo node key — tính 1 lần khi data load
  Map<String, double> _nodeKeyPriorityCache = {};

  // Cache: set dimmed nodes & edges — chỉ tính lại khi filter thay đổi
  final ValueNotifier<Set<String>> _dimmedNodeKeysNotifier = ValueNotifier({});
  final ValueNotifier<Set<String>> _dimmedEdgesNotifier = ValueNotifier({});

  void _buildNodeKeyPriorityCache(List<AnalyzedStory> stories) {
    _nodeKeyPriorityCache = {};

    // Lấy termPriorities từ ViewModel (đã propagate qua PERFORM/TARGET)
    final vm = context.read<GraphViewModel>();
    final termPriorities = vm.termPriorities;

    // Với mỗi story, gán priority cho sub/verb/obj key
    // dựa trên termPriorities[termLabel] (termId = termLabel cho TERM nodes)
    for (var s in stories) {
      String subKey = 'sub_${s.subject}';
      String verbKey = 'verb_${s.verb}';
      String objKey = _isObjectASubject(s.object, stories)
          ? 'sub_${s.object}'
          : _makeObjectKey(s.object);

      // Dùng termPriorities trước, rồi mới fallback về story-level priority, mặc định 0.0 nếu null
      double subPri = termPriorities[s.subject] ?? s.subjectPriority ?? 0.0;
      double verbPri = termPriorities[s.verb] ?? s.verbPriority ?? 0.0;
      double objPri = termPriorities[s.object] ?? s.objectPriority ?? 0.0;

      _nodeKeyPriorityCache[subKey] = max(
        _nodeKeyPriorityCache[subKey] ?? 0.0,
        subPri,
      );
      _nodeKeyPriorityCache[verbKey] = max(
        _nodeKeyPriorityCache[verbKey] ?? 0.0,
        verbPri,
      );
      _nodeKeyPriorityCache[objKey] = max(
        _nodeKeyPriorityCache[objKey] ?? 0.0,
        objPri,
      );
    }
  }

  void _updateDimmedSets(double threshold) {
    if (threshold <= 0.0) {
      _dimmedNodeKeysNotifier.value = {};
      _dimmedEdgesNotifier.value = {};
      return;
    }

    final Set<String> dimmedNodes = {};
    for (var entry in _nodeKeyPriorityCache.entries) {
      if (entry.value < threshold) dimmedNodes.add(entry.key);
    }

    final Set<String> dimmedEdges = {};
    for (var edge in edges) {
      final parts = edge.split('|');
      if (parts.length == 2 &&
          (dimmedNodes.contains(parts[0]) || dimmedNodes.contains(parts[1]))) {
        dimmedEdges.add(edge);
      }
    }

    _dimmedNodeKeysNotifier.value = dimmedNodes;
    _dimmedEdgesNotifier.value = dimmedEdges;
  }

  Offset? _nodeDragOffset;

  late AnimationController _spinController;
  final TransformationController _transformationController =
      TransformationController();

  GraphTheme get theme => GraphTheme.of(context);

  double get _priorityFilter => _priorityFilterNotifier.value;

  @override
  void initState() {
    super.initState();
    _transformationController.value = Matrix4.identity();

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
    _transformationController.dispose();
    _priorityFilterNotifier.dispose();
    _dimmedNodeKeysNotifier.dispose();
    _dimmedEdgesNotifier.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant _BacklogGraphScreenContent oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.workspaceId != widget.workspaceId ||
        oldWidget.backlogId != widget.backlogId) {
      _loadData();
    }
  }

  Future<void> _loadData({String source = 'REALTIME'}) async {
    final vm = context.read<GraphViewModel>();
    await vm.fetchGraphData(
      widget.workspaceId,
      widget.backlogId,
      source: source,
    );

    if (mounted) {
      setState(() {
        if (vm.stories.isNotEmpty) {
          expandedSubjects.addAll(_getUniqueSubjects(vm.stories));
        }
        _calculateLayout(vm.stories);
        // Xây dựng cache priority 1 lần duy nhất sau khi data load
        _buildNodeKeyPriorityCache(vm.stories);
        _updateDimmedSets(_priorityFilterNotifier.value);
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
    Map<String, Offset> newPositions = {};
    edges.clear();

    List<String> subjects = _getUniqueSubjects(stories);
    const double subjectX = 350;
    const double verbX = 650;
    const double objectX = 950;

    double currentSubjectY = 200;
    const double spacing = 120;

    for (var subName in subjects) {
      newPositions["sub_$subName"] = Offset(subjectX, currentSubjectY);
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

    double currentVerbY = 200;
    for (var verbKey in uniqueVerbs) {
      newPositions[verbKey] = Offset(verbX, currentVerbY);
      currentVerbY += spacing;
    }

    double currentObjY = 200;
    for (var objKey in uniqueObjects) {
      newPositions[objKey] = Offset(objectX, currentObjY);
      currentObjY += spacing;
    }

    _positionsNotifier.value = newPositions;
  }

  void _avoidCollision(String movedKey, Offset newPos) {
    const minDist = 70.0;
    final map = Map<String, Offset>.from(_positionsNotifier.value);
    map[movedKey] = newPos;
    for (var key in map.keys) {
      if (key == movedKey) continue;
      final other = map[key]!;
      final dist = (newPos - other).distance;
      if (dist < minDist && dist > 0) {
        final push = (other - newPos) / dist * (minDist - dist) * 0.5;
        map[key] = other + push;
      }
    }
    _positionsNotifier.value = map;
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
        _positionsNotifier.value.forEach((key, pos) {
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
                  transformationController: _transformationController,
                  panEnabled: !_isLassoMode,
                  scaleEnabled: !_isLassoMode,
                  constrained: false,
                  boundaryMargin: const EdgeInsets.all(300),
                  minScale: 0.2,
                  maxScale: 3.0,
                  child: GestureDetector(
                    onPanStart: _isLassoMode ? _onLassoPanStart : null,
                    onPanUpdate: _isLassoMode ? _onLassoPanUpdate : null,
                    onPanEnd: _isLassoMode ? _onLassoPanEnd : null,
                    child: SizedBox(
                      width: 2500,
                      height: 5000,
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          ValueListenableBuilder<Set<String>>(
                            valueListenable: _dimmedEdgesNotifier,
                            builder: (context, dimmedEdges, _) {
                              return ValueListenableBuilder<
                                Map<String, Offset>
                              >(
                                valueListenable: _positionsNotifier,
                                builder: (context, positions, child) {
                                  return AnimatedBuilder(
                                    animation: _spinController,
                                    builder: (_, __) => CustomPaint(
                                      size: const Size(2500, 5000),
                                      painter: GraphLinesPainter(
                                        nodePositions: positions,
                                        edges: edges,
                                        highlightedEdges: highlightedEdges,
                                        dimmedEdges: dimmedEdges,
                                        theme: theme,
                                      ),
                                    ),
                                  );
                                },
                              );
                            },
                          ),
                          ValueListenableBuilder<Map<String, Offset>>(
                            valueListenable: _positionsNotifier,
                            builder: (context, positions, child) {
                              return CustomPaint(
                                size: const Size(2500, 5000),
                                painter: ZoningPainter(
                                  nodePositions: positions,
                                  zonedSubjects: zonedSubjects,
                                  mockData: vm.stories,
                                  isObjectASubject: (obj) =>
                                      _isObjectASubject(obj, vm.stories),
                                  makeObjectKey: _makeObjectKey,
                                  theme: theme,
                                ),
                              );
                            },
                          ),
                          if (_isLassoMode && _drawnPoints.isNotEmpty)
                            CustomPaint(
                              size: const Size(2500, 5000),
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
                  top: 16,
                  right: 16,
                  child: GraphLegend(
                    stories: vm.stories,
                    theme: theme,
                    uniqueSubjects: _getUniqueSubjects(vm.stories),
                  ),
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
                            SnackBar(
                              content: Text(
                                'Bắt đầu Sprint với các hành động đã chọn!',
                              ),
                            ),
                          );
                          setState(() => _selectedNodeKeys.clear());
                        },
                        onClose: () =>
                            setState(() => _selectedNodeKeys.clear()),
                      ),
                    ),
                  ),
                if (_showFilterSlider)
                  Positioned(right: 80, bottom: 32, child: _buildFilterPanel()),
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

    for (var key in _positionsNotifier.value.keys) {
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
    double width = type == NodeType.verb ? 64 : 110;
    double height = type == NodeType.verb
        ? 64
        : (type == NodeType.subject ? 60 : 44);

    bool isHovered = _hoveredNodeKey == key;
    bool isSelected = _selectedNodeKeys.contains(key);

    bool isActive = true;
    if (_hoveredNodeKey != null) {
      if (_hoveredNodeKey == key) {
        isActive = true;
      } else {
        isActive =
            edges.contains("$key|$_hoveredNodeKey") ||
            edges.contains("$_hoveredNodeKey|$key");
      }
    }

    int storyCount = type == NodeType.object
        ? _countStoriesForObject(text, stories)
        : 0;

    return ValueListenableBuilder<Map<String, Offset>>(
      valueListenable: _positionsNotifier,
      builder: (context, positions, child) {
        final pos = positions[key] ?? Offset.zero;
        return Positioned(
          left: pos.dx - width / 2,
          top: pos.dy - height / 2 - (type == NodeType.verb ? 12 : 0),
          child: child!,
        );
      },
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
              onPanStart: (d) {
                if (!_isZoningMode && !_isLassoMode) {
                  final RenderBox renderBox =
                      context.findRenderObject() as RenderBox;
                  final localPos = renderBox.globalToLocal(d.globalPosition);
                  final scenePoint = _transformationController.toScene(
                    localPos,
                  );
                  final pos = _positionsNotifier.value[key] ?? Offset.zero;
                  _nodeDragOffset = pos - scenePoint;
                }
              },
              onPanUpdate: (d) {
                if (!_isZoningMode &&
                    !_isLassoMode &&
                    _nodeDragOffset != null) {
                  final RenderBox renderBox =
                      context.findRenderObject() as RenderBox;
                  final localPos = renderBox.globalToLocal(d.globalPosition);
                  final scenePoint = _transformationController.toScene(
                    localPos,
                  );
                  _avoidCollision(key, scenePoint + _nodeDragOffset!);
                }
              },
              onPanEnd: (d) {
                _nodeDragOffset = null;
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
              // ValueListenableBuilder giúp ẩn hiện node lập tức khi kéo slider không cần setState
              child: ValueListenableBuilder<Set<String>>(
                valueListenable: _dimmedNodeKeysNotifier,
                builder: (context, dimmedKeys, _) {
                  if (dimmedKeys.contains(key)) {
                    return const SizedBox.shrink(); // Ẩn hoàn toàn node
                  }

                  return Opacity(
                    opacity: isActive ? 1.0 : 0.2,
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        type == NodeType.subject
                            ? GraphNodeWidgets.buildSubjectNode(
                                text,
                                width,
                                height,
                                isHovered,
                                isSelected,
                                theme,
                              )
                            : type == NodeType.verb
                            ? GraphNodeWidgets.buildVerbNode(
                                text,
                                width,
                                height,
                                isHovered,
                                isSelected,
                                theme,
                                _spinController,
                              )
                            : GraphNodeWidgets.buildObjectNode(
                                text,
                                story,
                                width,
                                height,
                                isHovered,
                                isSelected,
                                theme,
                              ),
                        if (isHovered && type == NodeType.object)
                          Positioned(
                            left: width + 8,
                            top: 0,
                            child: NodeTooltip(
                              objectName: text,
                              count: storyCount,
                              theme: theme,
                            ),
                          ),
                      ],
                    ),
                  );
                },
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
    } else if (type == NodeType.verb && story != null) {
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
          heroTag: "filter",
          icon: Icons.filter_alt,
          active: _showFilterSlider,
          onPressed: () =>
              setState(() => _showFilterSlider = !_showFilterSlider),
        ),
        const SizedBox(height: 10),
        _fabButton(
          heroTag: "r",
          icon: Icons.refresh,
          onPressed: () async {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Đang kích hoạt rebuild graph...')),
            );
            final success = await WorkspaceService().rebuildGraph(
              widget.workspaceId,
            );
            if (success) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text(
                      'Đang phân tích dữ liệu, vui lòng chờ...',
                    ),
                    backgroundColor: theme.inProgressColor,
                  ),
                );

                // Đợi 3 giây để Backend xử lý NLP xong
                await Future.delayed(const Duration(seconds: 3));

                if (mounted) {
                  context.read<GraphViewModel>().fetchGraphData(
                    widget.workspaceId,
                    widget.backlogId,
                    source: 'BATCH', // Gọi API batch để lấy kết quả
                  );
                }
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

  Widget _buildFilterPanel() {
    return Container(
      width: 280,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: theme.panelBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.panelBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ValueListenableBuilder<double>(
        valueListenable: _priorityFilterNotifier,
        builder: (ctx, filterVal, _) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Filter by Priority (Hide < ${filterVal.toStringAsFixed(2)})',
                style: TextStyle(
                  color: theme.textPrimary,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Slider(
                value: filterVal,
                min: 0.0,
                max: 1.0,
                activeColor: theme.verbBorder,
                inactiveColor: theme.panelBorder,
                onChanged: (v) {
                  // Chỉ cập nhật ValueNotifier và dimmed sets
                  // Không gọi setState → không rebuild toàn bộ tree!
                  _priorityFilterNotifier.value = v;
                  _updateDimmedSets(v);
                },
              ),
            ],
          );
        },
      ),
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

  Widget _buildDetailRow(String label, String value, GraphTheme theme) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 60,
          child: Text(
            label,
            style: TextStyle(
              color: theme.textSecondary,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              color: theme.textPrimary,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }

  void _showActionMenu(BuildContext context, AnalyzedStory story) {
    // Tính priority từ cache hoặc story
    final double? priority =
        _nodeKeyPriorityCache['obj_${story.object}'] ??
        _nodeKeyPriorityCache['sub_${story.subject}'] ??
        story.objectPriority ??
        story.subjectPriority;

    showModalBottomSheet(
      context: context,
      backgroundColor: theme.panelBg,
      isScrollControlled: true,
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        side: BorderSide(color: theme.panelBorder),
      ),
      builder: (c) => DraggableScrollableSheet(
        initialChildSize: 0.55,
        minChildSize: 0.35,
        maxChildSize: 0.85,
        expand: false,
        builder: (_, scrollCtrl) => SingleChildScrollView(
          controller: scrollCtrl,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Handle bar
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      color: theme.panelBorder,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),

                // Header: S-V-O chip + status
                Row(
                  children: [
                    _statusChip(story.status),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        '${story.subject} → ${story.verb} → ${story.object}',
                        style: TextStyle(
                          color: theme.textSecondary,
                          fontSize: 12,
                          letterSpacing: 0.3,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Simple ID / Type / Priority display
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: theme.verbBorder.withOpacity(0.06),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: theme.verbBorder.withOpacity(0.2),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.info_outline,
                            size: 16,
                            color: theme.verbBorder,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Node Details',
                            style: TextStyle(
                              color: theme.verbBorder,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _buildDetailRow('ID', story.id, theme),
                      const SizedBox(height: 8),
                      _buildDetailRow('Type', 'S-V-O Path Node', theme),
                      const SizedBox(height: 8),
                      _buildDetailRow(
                        'Priority',
                        priority != null
                            ? '${(priority * 100).toStringAsFixed(2)}%'
                            : 'N/A',
                        theme,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Priority bar
                if (priority != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: priority.clamp(0.0, 1.0),
                      minHeight: 6,
                      backgroundColor: theme.panelBorder,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        priority > 0.6
                            ? Colors.greenAccent.shade400
                            : priority > 0.3
                            ? Colors.orangeAccent
                            : Colors.redAccent,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Story ID (copyable)
                GestureDetector(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: story.id));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('✓ Story ID copied to clipboard'),
                        duration: Duration(seconds: 1),
                      ),
                    );
                  },
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: theme.panelBorder.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.fingerprint,
                          size: 14,
                          color: theme.textSecondary,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            story.id,
                            style: TextStyle(
                              color: theme.textSecondary,
                              fontSize: 11,
                              fontFamily: 'monospace',
                              letterSpacing: 0.5,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Icon(Icons.copy, size: 13, color: theme.textSecondary),
                      ],
                    ),
                  ),
                ),

                // Score info
                if (story.performScore != null ||
                    story.targetScore != null) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      if (story.performScore != null)
                        _scoreChip(
                          'Perform',
                          story.performScore!,
                          theme.subjectBorder,
                        ),
                      if (story.performScore != null &&
                          story.targetScore != null)
                        const SizedBox(width: 8),
                      if (story.targetScore != null)
                        _scoreChip(
                          'Target',
                          story.targetScore!,
                          theme.verbBorder,
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _scoreChip(String label, double score, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        '$label: ${score.toStringAsFixed(2)}',
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
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
