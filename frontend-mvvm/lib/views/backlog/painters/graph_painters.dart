import 'dart:math';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';

import '../../../models/backlog/graph_model.dart';
import '../theme/graph_theme.dart';

class GraphLinesPainter extends CustomPainter {
  final Map<String, Offset> nodePositions;
  final Set<String> edges;
  final Set<String> highlightedEdges;
  final GraphTheme theme;

  GraphLinesPainter({
    required this.nodePositions,
    required this.edges,
    required this.highlightedEdges,
    required this.theme,
  });

  @override
  void paint(Canvas canvas, Size size) {
    for (var edge in edges) {
      final parts = edge.split('|');
      if (parts.length != 2) continue;

      final fromKey = parts[0];
      final toKey = parts[1];

      if (!nodePositions.containsKey(fromKey) ||
          !nodePositions.containsKey(toKey))
        continue;

      Offset fromCenter = nodePositions[fromKey]!;
      Offset toCenter = nodePositions[toKey]!;

      bool isHighlighted = highlightedEdges.contains(edge);

      final paint = Paint()
        ..color = isHighlighted
            ? theme.highlightLine.withOpacity(0.9)
            : theme.lineColor
        ..strokeWidth = isHighlighted ? 2.5 : 1.0
        ..style = PaintingStyle.stroke;

      _drawCurvedLine(canvas, fromCenter, toCenter, paint);
    }
  }

  void _drawCurvedLine(Canvas canvas, Offset from, Offset to, Paint paint) {
    final mid = Offset((from.dx + to.dx) / 2, (from.dy + to.dy) / 2);
    final path = Path()
      ..moveTo(from.dx, from.dy)
      ..quadraticBezierTo(mid.dx, from.dy, to.dx, to.dy);
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant GraphLinesPainter old) => true;
}

class ZoningPainter extends CustomPainter {
  final Map<String, Offset> nodePositions;
  final Set<String> zonedSubjects;
  final List<AnalyzedStory> mockData;
  final Function(String) isObjectASubject;
  final Function(String) makeObjectKey;
  final GraphTheme theme;

  ZoningPainter({
    required this.nodePositions,
    required this.zonedSubjects,
    required this.mockData,
    required this.isObjectASubject,
    required this.makeObjectKey,
    required this.theme,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (zonedSubjects.isEmpty) return;
    final paint = Paint()
      ..color = theme.verbBorder.withOpacity(0.8)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    for (var subName in zonedSubjects) {
      final stories = mockData.where((e) => e.subject == subName).toList();
      for (var s in stories) {
        if (!isObjectASubject(s.object)) {
          String objKey = makeObjectKey(s.object);
          if (nodePositions.containsKey(objKey)) {
            _drawDashedCircle(canvas, nodePositions[objKey]!, 54, paint);
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
  bool shouldRepaint(covariant CustomPainter old) => true;
}

class GlowCirclePainter extends CustomPainter {
  final Color color;
  final double glowRadius;
  final double animValue;

  GlowCirclePainter({
    required this.color,
    required this.glowRadius,
    required this.animValue,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;
    double pulse = 0.5 + 0.5 * sin(animValue * 2 * pi);
    final glowPaint = Paint()
      ..color = color.withOpacity(0.15 + 0.1 * pulse)
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, 8 + 4 * pulse);
    canvas.drawCircle(center, radius + 4, glowPaint);
  }

  @override
  bool shouldRepaint(covariant GlowCirclePainter old) =>
      old.animValue != animValue || old.glowRadius != glowRadius;
}

class LassoPainter extends CustomPainter {
  final List<Offset> drawnPoints;
  final GraphTheme theme;

  LassoPainter({required this.drawnPoints, required this.theme});

  @override
  void paint(Canvas canvas, Size size) {
    if (drawnPoints.isEmpty) return;

    final path = Path();
    path.moveTo(drawnPoints.first.dx, drawnPoints.first.dy);
    for (int i = 1; i < drawnPoints.length; i++) {
      path.lineTo(drawnPoints[i].dx, drawnPoints[i].dy);
    }

    final strokePaint = Paint()
      ..color = theme.lassoColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    canvas.drawPath(path, strokePaint);
  }

  @override
  bool shouldRepaint(covariant LassoPainter oldDelegate) {
    return true;
  }
}
