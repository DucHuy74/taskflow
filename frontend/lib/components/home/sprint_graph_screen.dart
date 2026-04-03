import 'dart:math';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';

// =============================================================================
// 1. DATA MODEL
// =============================================================================
enum USStatus { todo, inProgress, done }

class AnalyzedStory {
  final String id;
  final String rawText;
  final String subject;
  final String verb;
  final String object;
  USStatus status;

  AnalyzedStory({
    required this.id,
    required this.rawText,
    required this.subject,
    required this.verb,
    required this.object,
    this.status = USStatus.todo,
  });
}

// Dữ liệu mẫu
final List<AnalyzedStory> mockBacklogData = [
  // User
  AnalyzedStory(
    id: 'us_001',
    rawText: "User login",
    subject: "User",
    verb: "login",
    object: "system",
    status: USStatus.done, // Nền xanh lá
  ),
  AnalyzedStory(
    id: 'us_0011',
    rawText: "User login",
    subject: "User",
    verb: "login",
    object: "system",
    status: USStatus.done, // Giống trên để test nhiều object cùng tên
  ),
  AnalyzedStory(
    id: 'us_003',
    rawText: "User view profile",
    subject: "User",
    verb: "view",
    object: "profile",
    status: USStatus.todo, // Nền xám
  ),

  // Admin
  AnalyzedStory(
    id: 'us_002',
    rawText: "Admin delete user",
    subject: "Admin",
    verb: "delete",
    object: "User",
    status: USStatus.inProgress, // Nền trắng, viền quay
  ),
  AnalyzedStory(
    id: 'us_004',
    rawText: "Admin login",
    subject: "Admin",
    verb: "login",
    object: "system",
    status: USStatus.todo,
  ),
  AnalyzedStory(
    id: 'us_006',
    rawText: "Admin login done",
    subject: "Admin",
    verb: "login",
    object: "system",
    status: USStatus.done,
  ),

  // Product Owner
  AnalyzedStory(
    id: 'us_005',
    rawText: "PO login",
    subject: "Product Owner",
    verb: "login",
    object: "system",
    status: USStatus.inProgress,
  ),
];

// =============================================================================
// 2. MÀN HÌNH CHÍNH
// =============================================================================
class SprintGraphScreen extends StatefulWidget {
  final String sprintId;
  final String sprintName;

  const SprintGraphScreen({
    Key? key,
    required this.sprintId,
    required this.sprintName,
  }) : super(key: key);

  @override
  _SprintGraphScreenState createState() => _SprintGraphScreenState();
}

class _SprintGraphScreenState extends State<SprintGraphScreen>
    with SingleTickerProviderStateMixin {
  Map<String, Offset> nodePositions = {};
  Map<String, String> verbToTargetKey = {};

  Set<String> expandedSubjects = {};
  Set<String> zonedSubjects = {};
  bool _isZoningMode = false;

  late AnimationController _spinController;

  @override
  void initState() {
    super.initState();
    _calculateLayout();

    _spinController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1), 
    )..repeat();
  }

  @override
  void dispose() {
    _spinController.dispose();
    super.dispose();
  }

  List<String> _getUniqueSubjects() {
    List<String> subjects = [];
    for (var s in mockBacklogData) {
      if (!subjects.contains(s.subject)) subjects.add(s.subject);
    }
    return subjects;
  }

  bool _isObjectASubject(String objectName) {
    return _getUniqueSubjects().contains(objectName);
  }

  String _makeObjectKey(String name, USStatus status) {
    return "obj_${name}_$status";
  }

  void _calculateLayout() {
    nodePositions.clear();
    verbToTargetKey.clear();

    double subjectX = 100;
    double verbX = 350;
    double objectX = 650;

    double startY = 100;
    double subjectSpacing = 120;
    double verbSpacing = 70;

    List<String> subjects = _getUniqueSubjects();

    double currentSubjectY = startY;
    for (var subName in subjects) {
      nodePositions["sub_$subName"] = Offset(subjectX, currentSubjectY);
      currentSubjectY += subjectSpacing;
    }

    double globalVerbY = startY;
    for (var subName in subjects) {
      if (!expandedSubjects.contains(subName)) continue;

      final stories = mockBacklogData
          .where((e) => e.subject == subName)
          .toList();

      for (var story in stories) {
        String verbKey = "verb_${story.id}";
        nodePositions[verbKey] = Offset(verbX, globalVerbY);

        String targetKey;
        if (_isObjectASubject(story.object)) {
          targetKey = "sub_${story.object}";
        } else {
          targetKey = _makeObjectKey(story.object, story.status);
        }

        verbToTargetKey[verbKey] = targetKey;
        globalVerbY += verbSpacing;
      }
    }

    Map<String, List<String>> targetToVerbs = {};
    for (var entry in verbToTargetKey.entries) {
      String verbId = entry.key;
      String targetKey = entry.value;

      if (targetKey.startsWith("sub_")) continue;

      if (!targetToVerbs.containsKey(targetKey)) {
        targetToVerbs[targetKey] = [];
      }
      targetToVerbs[targetKey]!.add(verbId);
    }

    for (var targetKey in targetToVerbs.keys) {
      List<String> verbIds = targetToVerbs[targetKey]!;
      double totalY = 0;
      for (var verbId in verbIds) {
        if (nodePositions.containsKey(verbId)) {
          totalY += nodePositions[verbId]!.dy;
        }
      }
      double avgY = totalY / verbIds.length;
      nodePositions[targetKey] = Offset(objectX, avgY);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(widget.sprintName),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      floatingActionButton: _buildFab(),
      body: InteractiveViewer(
        constrained: false,
        boundaryMargin: const EdgeInsets.all(2000),
        minScale: 0.1,
        maxScale: 3.0,
        child: SizedBox(
          width: 2500,
          height: 2500,
          child: Stack(
            children: [
              // LỚP 1: DÂY NỐI
              AnimatedBuilder(
                animation: _spinController,
                builder: (context, child) {
                  return CustomPaint(
                    size: const Size(2500, 2500),
                    painter: HorizontalLinesPainter(
                      nodePositions: nodePositions,
                      expandedSubjects: expandedSubjects,
                      mockData: mockBacklogData,
                      verbToTargetKey: verbToTargetKey,
                      subjects: _getUniqueSubjects(),
                    ),
                  );
                },
              ),

              // LỚP 2: VÙNG KHOANH
              CustomPaint(
                size: const Size(2500, 2500),
                painter: ZoningPainter(
                  nodePositions: nodePositions,
                  zonedSubjects: zonedSubjects,
                  mockData: mockBacklogData,
                  isObjectASubject: _isObjectASubject,
                  makeObjectKey: _makeObjectKey,
                ),
              ),

              // LỚP 3: CÁC NODE
              ..._buildNodeWidgets(),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildNodeWidgets() {
    List<Widget> widgets = [];
    List<String> subjects = _getUniqueSubjects();

    for (var subName in subjects) {
      String key = "sub_$subName";
      if (nodePositions.containsKey(key)) {
        widgets.add(_createDraggableNode(key, subName, NodeType.subject, null));
      }
    }

    for (var subName in expandedSubjects) {
      final stories = mockBacklogData
          .where((e) => e.subject == subName)
          .toList();
      for (var s in stories) {
        String verbKey = "verb_${s.id}";
        if (nodePositions.containsKey(verbKey)) {
          widgets.add(
            _createDraggableNode(verbKey, s.verb, NodeType.verb, null),
          );
        }
      }
    }

    Set<String> renderedObjectKeys = {};
    for (var story in mockBacklogData) {
      if (_isObjectASubject(story.object)) continue;

      String objKey = _makeObjectKey(story.object, story.status);

      if (!renderedObjectKeys.contains(objKey) &&
          nodePositions.containsKey(objKey)) {
        renderedObjectKeys.add(objKey);
        widgets.add(
          _createDraggableNode(objKey, story.object, NodeType.object, story),
        );
      }
    }
    return widgets;
  }

  Widget _createDraggableNode(
    String key,
    String text,
    NodeType type,
    AnalyzedStory? story,
  ) {
    Offset pos = nodePositions[key]!;
    double width = type == NodeType.subject
        ? 100
        : (type == NodeType.object ? 80 : 90);
    double height = type == NodeType.subject
        ? 100
        : (type == NodeType.object ? 80 : 45);
    double left = pos.dx - (width / 2);
    double top = pos.dy - (height / 2);

    return Positioned(
      left: left,
      top: top,
      child: GestureDetector(
        onPanUpdate: (details) {
          if (!_isZoningMode) {
            setState(() {
              nodePositions[key] = pos + details.delta;
            });
          }
        },
        onTap: () {
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
              _calculateLayout();
            });
          } else if (type == NodeType.object && story != null) {
            _showActionMenu(context, story);
          }
        },
        child: MouseRegion(
          cursor: _isZoningMode && type == NodeType.subject
              ? SystemMouseCursors.cell
              : SystemMouseCursors.move,
          child: _buildNodeUI(text, type, story, width, height),
        ),
      ),
    );
  }

  Widget _buildNodeUI(
    String text,
    NodeType type,
    AnalyzedStory? story,
    double w,
    double h,
  ) {
    // 1. NODE VERB
    if (type == NodeType.verb) {
      return Container(
        width: w,
        height: h,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: Colors.black, width: 2.0),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text(
          text,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
        ),
      );
    }

    // 2. NODE SUBJECT
    if (type == NodeType.subject) {
      bool isExpanded = expandedSubjects.contains(text);
      return Container(
        width: w,
        height: h,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: const Color(0xFF0052CC),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Colors.black26,
              blurRadius: 6,
              offset: Offset(0, 3),
            ),
          ],
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Text(
              text,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
            if (isExpanded)
              Positioned(
                bottom: 5,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        ),
      );
    }

    // 3. NODE OBJECT (XỬ LÝ MÀU NỀN & VIỀN THEO STATUS)

    // Xác định màu nền và màu chữ
    Color bgColor = Colors.white;
    Color textColor = Colors.black;
    USStatus status = story?.status ?? USStatus.todo;

    if (status == USStatus.done) {
      bgColor = Colors.green; // Nền xanh lá
      textColor = Colors.white; // Chữ trắng
    } else if (status == USStatus.todo) {
      bgColor = Colors.grey; // Nền xám
      textColor = Colors.white; // Chữ trắng
    } else {
      // InProgress: Nền trắng, Chữ đen
      bgColor = Colors.white;
      textColor = Colors.black;
    }

    return AnimatedBuilder(
      animation: _spinController,
      builder: (context, child) {
        return CustomPaint(
          // Chỉ vẽ viền spinning nếu là InProgress
          painter: _StatusBorderPainter(status, _spinController.value),
          child: Container(
            width: w,
            height: h,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: bgColor,
              shape: BoxShape.circle,
              // Thêm bóng nhẹ cho đẹp
              boxShadow: [
                BoxShadow(
                  color: Colors.black12,
                  blurRadius: 2,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                Padding(
                  padding: const EdgeInsets.all(4.0),
                  child: Text(
                    text,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: textColor,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                // Icon tick cho trạng thái Done
                if (status == USStatus.done)
                  const Positioned(
                    top: 2,
                    right: 2,
                    child: Icon(Icons.check, color: Colors.white, size: 16),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildFab() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        FloatingActionButton(
          heroTag: "z",
          backgroundColor: _isZoningMode ? Colors.green : Colors.white,
          onPressed: () => setState(() => _isZoningMode = !_isZoningMode),
          child: Icon(
            Icons.ads_click,
            color: _isZoningMode ? Colors.white : Colors.black,
          ),
        ),
        const SizedBox(height: 10),
        FloatingActionButton(
          heroTag: "expand",
          backgroundColor: Colors.white,
          onPressed: () => setState(() {
            if (expandedSubjects.length == _getUniqueSubjects().length) {
              expandedSubjects.clear();
            } else {
              expandedSubjects.addAll(_getUniqueSubjects());
            }
            _calculateLayout();
          }),
          child: Icon(
            expandedSubjects.isEmpty ? Icons.unfold_more : Icons.unfold_less,
            color: Colors.black,
          ),
        ),
        const SizedBox(height: 10),
        FloatingActionButton(
          heroTag: "r",
          backgroundColor: Colors.white,
          onPressed: () => setState(() {
            _calculateLayout();
          }),
          child: const Icon(Icons.refresh, color: Colors.black),
        ),
      ],
    );
  }

  void _showActionMenu(BuildContext context, AnalyzedStory story) {
    showModalBottomSheet(
      context: context,
      builder: (c) => Container(
        height: 150,
        padding: EdgeInsets.all(20),
        child: Column(
          children: [
            Text(
              "${story.rawText} (${story.status.toString().split('.').last})",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 10),
            Text("Object ID: obj_${story.object}_${story.status}"),
          ],
        ),
      ),
    );
  }
}

enum NodeType { subject, verb, object }

// =============================================================================
// 3. PAINTER VẼ DÂY NỐI
// =============================================================================
class HorizontalLinesPainter extends CustomPainter {
  final Map<String, Offset> nodePositions;
  final Set<String> expandedSubjects;
  final List<AnalyzedStory> mockData;
  final Map<String, String> verbToTargetKey;
  final List<String> subjects;

  HorizontalLinesPainter({
    required this.nodePositions,
    required this.expandedSubjects,
    required this.mockData,
    required this.verbToTargetKey,
    required this.subjects,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke;

    for (var subName in subjects) {
      if (!expandedSubjects.contains(subName)) continue;

      String subKey = "sub_$subName";
      if (!nodePositions.containsKey(subKey)) continue;

      Offset subCenter = nodePositions[subKey]!;

      final stories = mockData.where((e) => e.subject == subName).toList();
      for (var s in stories) {
        String verbKey = "verb_${s.id}";

        if (nodePositions.containsKey(verbKey)) {
          Offset verbCenter = nodePositions[verbKey]!;
          canvas.drawLine(subCenter, verbCenter, paint);

          if (verbToTargetKey.containsKey(verbKey)) {
            String targetKey = verbToTargetKey[verbKey]!;
            if (nodePositions.containsKey(targetKey)) {
              Offset objCenter = nodePositions[targetKey]!;
              canvas.drawLine(verbCenter, objCenter, paint);
            }
          }
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

// =============================================================================
// 4. PAINTER PHỤ (ZONING)
// =============================================================================
class ZoningPainter extends CustomPainter {
  final Map<String, Offset> nodePositions;
  final Set<String> zonedSubjects;
  final List<AnalyzedStory> mockData;
  final Function(String) isObjectASubject;
  final Function(String, USStatus) makeObjectKey;

  ZoningPainter({
    required this.nodePositions,
    required this.zonedSubjects,
    required this.mockData,
    required this.isObjectASubject,
    required this.makeObjectKey,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (zonedSubjects.isEmpty) return;

    final paint = Paint()
      ..color = Colors.green
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    for (var subName in zonedSubjects) {
      final stories = mockData.where((e) => e.subject == subName).toList();
      for (var s in stories) {
        if (!isObjectASubject(s.object)) {
          String objKey = makeObjectKey(s.object, s.status);
          if (nodePositions.containsKey(objKey)) {
            _drawDashedCircle(canvas, nodePositions[objKey]!, 50, paint);
          }
        }
      }
    }
  }

  void _drawDashedCircle(
    Canvas canvas,
    Offset center,
    double radius,
    Paint paint,
  ) {
    const double dashWidth = 8, dashSpace = 6;
    Path path = Path()
      ..addOval(Rect.fromCircle(center: center, radius: radius));
    for (ui.PathMetric metric in path.computeMetrics()) {
      double d = 0.0;
      while (d < metric.length) {
        canvas.drawPath(metric.extractPath(d, d + dashWidth), paint);
        d += dashWidth + dashSpace;
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

// =============================================================================
// 5. STATUS BORDER PAINTER (SPINNING EFFECT)
// =============================================================================
class _StatusBorderPainter extends CustomPainter {
  final USStatus status;
  final double animationValue;

  _StatusBorderPainter(this.status, this.animationValue);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    // Bán kính border: lớn hơn một chút so với container để bao quanh
    final radius = (size.width / 2) + 2;

    // CHỈ VẼ HIỆU ỨNG NẾU LÀ IN_PROGRESS
    if (status == USStatus.inProgress) {
      // 1. Vẽ đường tròn nền (Track) màu xám nhạt
      Paint trackPaint = Paint()
        ..color = Colors.grey.shade300
        ..strokeWidth = 3.0
        ..style = PaintingStyle.stroke;
      canvas.drawCircle(center, radius, trackPaint);

      // 2. Vẽ cung xoay (Indicator) màu đen
      Paint indicatorPaint = Paint()
        ..color = Colors
            .black // Màu đen giống ảnh
        ..strokeWidth = 3.0
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round;

      // Logic xoay:
      double startAngle = animationValue * 2 * pi; // Xoay vòng tròn
      double sweepAngle = pi / 2; // Độ dài cung (90 độ)

      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        sweepAngle,
        false,
        indicatorPaint,
      );
    }
    // Todo & Done không cần vẽ border ở đây vì đã có màu nền xử lý
  }

  @override
  bool shouldRepaint(covariant _StatusBorderPainter oldDelegate) {
    return oldDelegate.animationValue != animationValue ||
        oldDelegate.status != status;
  }
}
