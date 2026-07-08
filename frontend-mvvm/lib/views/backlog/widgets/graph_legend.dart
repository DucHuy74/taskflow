import 'package:flutter/material.dart';

import '../../../models/backlog/graph_model.dart';
import '../theme/graph_theme.dart';

class GraphLegend extends StatelessWidget {
  final List<AnalyzedStory> stories;
  final GraphTheme theme;
  final List<String> uniqueSubjects;

  const GraphLegend({
    Key? key,
    required this.stories,
    required this.theme,
    required this.uniqueSubjects,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.panelBg,
        border: Border.all(color: theme.panelBorder),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'RADIAL S-V-O GRAPH',
            style: TextStyle(
              color: theme.textSecondary,
              fontSize: 10,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 10),
          _legendItem(theme.subjectBorder, 'Actor (S)', isCircle: true),
          _legendItem(theme.objectBorder, 'Object (O)', isCircle: false),
          _legendItem(theme.verbBorder, 'Action (V)', isCircle: true),
          const SizedBox(height: 6),
          _legendItem(theme.doneColor, 'Done', isDot: true),
          _legendItem(theme.inProgressColor, 'In Progress', isDot: true),
          const SizedBox(height: 8),
          Text(
            '${uniqueSubjects.length} entities / ${stories.length} stories',
            style: TextStyle(color: theme.textSecondary, fontSize: 10),
          ),
        ],
      ),
    );
  }

  Widget _legendItem(
    Color color,
    String label, {
    bool isCircle = false,
    bool isDot = false,
  }) {
    Widget icon;
    if (isDot) {
      icon = Container(
        width: 10,
        height: 10,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      );
    } else if (isCircle) {
      icon = Container(
        width: 14,
        height: 14,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: color, width: 2),
          color: Colors.transparent,
        ),
      );
    } else {
      icon = Container(
        width: 18,
        height: 12,
        decoration: BoxDecoration(
          border: Border.all(color: color, width: 1.5),
          borderRadius: BorderRadius.circular(3),
          color: Colors.transparent,
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          icon,
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(color: theme.textSecondary, fontSize: 11),
          ),
        ],
      ),
    );
  }
}
