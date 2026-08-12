import 'package:flutter/material.dart';
import '../theme/graph_theme.dart';

class NodeTooltip extends StatelessWidget {
  final String objectName;
  final int count;
  final GraphTheme theme;

  const NodeTooltip({
    Key? key,
    required this.objectName,
    required this.count,
    required this.theme,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: theme.panelBg,
        border: Border.all(color: theme.panelBorder),
        borderRadius: BorderRadius.circular(8),
        boxShadow: [
          BoxShadow(
            color: theme.tooltipShadow,
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            objectName,
            style: TextStyle(
              color: theme.textPrimary,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Object entity -- reused in $count ${count == 1 ? 'story' : 'stories'}',
            style: TextStyle(color: theme.textSecondary, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
